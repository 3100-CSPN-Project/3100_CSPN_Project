import { createClient } from '@supabase/supabase-js';

const DEFAULT_SEASON = 2026;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_RETRIES = 5;
const MLB_REQUEST_TIMEOUT_MS = 30_000;
const MLB_API_BASE = (
  process.env.MLB_API_BASE_URL ?? 'https://statsapi.mlb.com/api/v1'
).replace(/\/$/, '');
const POSTSEASON_GAME_TYPES = ['F', 'D', 'L', 'W'];
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith('--')) continue;

    const [rawKey, inlineValue] = argument.slice(2).split('=', 2);

    if (inlineValue !== undefined) {
      options[rawKey] = inlineValue;
      continue;
    }

    const nextArgument = argv[index + 1];

    if (nextArgument && !nextArgument.startsWith('--')) {
      options[rawKey] = nextArgument;
      index += 1;
    } else {
      options[rawKey] = true;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
MLB 2026 importer

Required environment variables:
  SUPABASE_URL
  SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)

Examples:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \\
    node scripts/mlb/import-2026.mjs --mode backfill

  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \\
    node scripts/mlb/import-2026.mjs --mode sync --days 7

Options:
  --season 2026       Season to import. Defaults to 2026.
  --mode backfill      Import the complete season date range.
  --mode sync          Import recent regular-season games and all season postseason games.
  --days 7             Regular-season lookback for sync mode.
  --start-date DATE    Override the regular-season start date (YYYY-MM-DD).
  --end-date DATE      Override the regular-season end date (YYYY-MM-DD).
  --concurrency 4      Maximum simultaneous boxscore requests.
  --batch-size 200     Rows per Supabase upsert batch.
  --dry-run             Fetch and report games without writing to Supabase.
  --help                Show this message.
`);
}

function requireInteger(value, name, { minimum = 0 } = {}) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(
      `${name} must be an integer greater than or equal to ${minimum}.`,
    );
  }

  return parsed;
}

function parseDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${name} is not a valid calendar date.`);
  }

  return value;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateRange(options, season, mode) {
  const suppliedStart = options['start-date'];
  const suppliedEnd = options['end-date'];

  if (suppliedStart || suppliedEnd) {
    const startDate = parseDate(
      suppliedStart ?? `${season}-01-01`,
      'start-date',
    );
    const endDate = parseDate(suppliedEnd ?? `${season}-12-31`, 'end-date');

    if (startDate > endDate) {
      throw new Error('start-date must not be after end-date.');
    }

    return { startDate, endDate };
  }

  if (mode === 'backfill') {
    return {
      startDate: `${season}-01-01`,
      endDate: `${season}-12-31`,
    };
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const days = requireInteger(options.days ?? 7, 'days', { minimum: 0 });

  return {
    startDate: addDays(endDate, -days),
    endDate,
  };
}

function dateWindows(startDate, endDate, windowSize = 14) {
  const windows = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    const windowEnd = addDays(cursor, windowSize - 1);
    const boundedEnd = windowEnd < endDate ? windowEnd : endDate;

    windows.push({ startDate: cursor, endDate: boundedEnd });
    cursor = addDays(boundedEnd, 1);
  }

  return windows;
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function isFinalGame(game) {
  return (
    game.status?.abstractGameState === 'Final' ||
    game.status?.codedGameState === 'F'
  );
}

function isPostseasonGame(game) {
  return POSTSEASON_GAME_TYPES.includes(game.gameType);
}

function extractGames(payload) {
  if (Array.isArray(payload?.dates)) {
    return payload.dates.flatMap((date) => date.games ?? []);
  }

  return Array.isArray(payload?.games) ? payload.games : [];
}

function uniqueBy(rows, key) {
  const rowsByKey = new Map();

  for (const row of rows) {
    if (!row) continue;

    const value = row[key];
    if (value !== undefined && value !== null) rowsByKey.set(value, row);
  }

  return [...rowsByKey.values()];
}

function teamRow(teamReference, now) {
  const team = teamReference?.team ?? teamReference;
  const teamId = numberOrNull(team?.id);

  if (!teamId) return null;

  return {
    team_id: teamId,
    name: team.name ?? team.teamName ?? `Team ${teamId}`,
    abbreviation: team.abbreviation ?? null,
    team_name: team.teamName ?? null,
    location_name: team.locationName ?? null,
    league_id: numberOrNull(team.league?.id),
    division_id: numberOrNull(team.division?.id),
    source_json: team,
    updated_at: now,
  };
}

function gameRow(game, season, now) {
  const away = game.teams?.away ?? {};
  const home = game.teams?.home ?? {};
  const awayTeam = teamRow(away, now);
  const homeTeam = teamRow(home, now);
  const status = game.status ?? {};
  const venue = game.venue ?? {};

  return {
    game_pk: numberOrNull(game.gamePk),
    season: numberOrNull(game.season) ?? season,
    game_type: game.gameType ?? 'U',
    game_date: game.gameDate ?? null,
    official_date: game.officialDate ?? null,
    status_abstract: status.abstractGameState ?? null,
    status_code: status.codedGameState ?? null,
    status_detailed: status.detailedState ?? null,
    venue_id: numberOrNull(venue.id),
    venue_name: venue.name ?? null,
    away_team_id: awayTeam?.team_id ?? null,
    home_team_id: homeTeam?.team_id ?? null,
    away_score: numberOrNull(away.score),
    home_score: numberOrNull(home.score),
    is_final: isFinalGame(game),
    linescore: objectOrEmpty(game.linescore),
    game_number: numberOrNull(game.gameNumber),
    doubleheader: game.doubleHeader ?? null,
    series_description: game.seriesDescription ?? null,
    series_game_number: numberOrNull(game.seriesGameNumber),
    games_in_series: numberOrNull(game.gamesInSeries),
    source_json: game,
    source_fetched_at: now,
    updated_at: now,
  };
}

function playerRow(player, now) {
  player = player ?? {};
  const person = player.person ?? {};
  const playerId = numberOrNull(person.id);

  if (!playerId) return null;

  return {
    player_id: playerId,
    full_name: person.fullName ?? `Player ${playerId}`,
    first_name: person.firstName ?? null,
    last_name: person.lastName ?? null,
    primary_position:
      player.position?.abbreviation ?? player.position?.name ?? null,
    bat_side: player.batSide?.code ?? null,
    throw_hand: player.pitchHand?.code ?? null,
    source_json: person,
    updated_at: now,
  };
}

function hasStats(stats) {
  return Object.values(stats).some(
    (value) =>
      value && typeof value === 'object' && Object.keys(value).length > 0,
  );
}

function parseBoxscore(boxscore, gamePk, now) {
  const players = [];
  const teamStats = [];
  const playerEntities = [];
  const teamEntities = [];

  for (const side of ['home', 'away']) {
    const team = boxscore.teams?.[side];
    const teamEntity = teamRow(team, now);

    if (!team || !teamEntity) continue;

    teamEntities.push(teamEntity);
    teamStats.push({
      game_pk: gamePk,
      team_id: teamEntity.team_id,
      side,
      batting_stats: objectOrEmpty(team.teamStats?.batting),
      pitching_stats: objectOrEmpty(team.teamStats?.pitching),
      fielding_stats: objectOrEmpty(team.teamStats?.fielding),
      source_json: {
        team: team.team,
        teamStats: team.teamStats ?? {},
      },
      updated_at: now,
    });

    for (const player of Object.values(team.players ?? {})) {
      const entity = playerRow(player, now);
      const stats = objectOrEmpty(player.stats);

      if (!entity) continue;

      playerEntities.push(entity);

      if (!hasStats(stats)) continue;

      players.push({
        game_pk: gamePk,
        player_id: entity.player_id,
        team_id: teamEntity.team_id,
        side,
        jersey_number: player.jerseyNumber ?? null,
        position_abbreviation: player.position?.abbreviation ?? null,
        batting_order: player.battingOrder ?? null,
        batting_stats: objectOrEmpty(stats.batting),
        pitching_stats: objectOrEmpty(stats.pitching),
        fielding_stats: objectOrEmpty(stats.fielding),
        source_json: player,
        updated_at: now,
      });
    }
  }

  return {
    players,
    teamStats,
    playerEntities,
    teamEntities,
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(response, attempt) {
  const retryAfter = response?.headers?.get('retry-after');
  const retryAfterSeconds = Number(retryAfter);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(retryAfterSeconds * 1000, 60_000);
  }

  return Math.min(1000 * 2 ** attempt, 30_000);
}

async function fetchMlb(path, params = {}, retries = DEFAULT_RETRIES) {
  const url = new URL(`${MLB_API_BASE}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response;

    try {
      response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'cspn-sports-mlb-importer/1.0',
        },
        signal: AbortSignal.timeout(MLB_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;

      if (attempt === retries) throw error;

      await sleep(Math.min(1000 * 2 ** attempt, 30_000));
      continue;
    }

    if (response.ok) return response.json();

    const responseText = await response.text();
    const error = new Error(
      `MLB API ${response.status} for ${url}: ${responseText.slice(0, 300)}`,
    );

    if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === retries) {
      throw error;
    }

    lastError = error;
    await sleep(retryDelay(response, attempt));
  }

  throw lastError ?? new Error(`MLB request failed for ${url}.`);
}

function createSupabaseClient() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Set SUPABASE_URL before running the importer.');
  }

  if (!secretKey) {
    throw new Error(
      'Set SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) before running the importer. Do not use a browser key.',
    );
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function upsertRows(client, table, rows, onConflict, batchSize) {
  if (rows.length === 0) return;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await client.from(table).upsert(batch, { onConflict });

    if (error) {
      throw new Error(`Supabase upsert failed for ${table}: ${error.message}`);
    }
  }
}

async function startIngestRun(client, season, mode) {
  const { data, error } = await client
    .from('mlb_ingest_runs')
    .insert({ season, mode, status: 'running' })
    .select('run_id')
    .single();

  if (error) {
    throw new Error(`Unable to start ingest run: ${error.message}`);
  }

  return data.run_id;
}

async function updateIngestRun(client, runId, values) {
  const { error } = await client
    .from('mlb_ingest_runs')
    .update(values)
    .eq('run_id', runId);

  if (error) {
    throw new Error(`Unable to update ingest run ${runId}: ${error.message}`);
  }
}

async function fetchRegularGames(season, startDate, endDate) {
  const payloads = [];

  for (const window of dateWindows(startDate, endDate)) {
    const payload = await fetchMlb('/schedule', {
      sportId: 1,
      season,
      gameTypes: 'R',
      startDate: window.startDate,
      endDate: window.endDate,
      hydrate: 'team,venue,linescore',
    });

    payloads.push(payload);
  }

  return payloads;
}

async function fetchPostseasonGames(season) {
  return fetchMlb('/schedule/postseason', {
    sportId: 1,
    season,
    gameTypes: POSTSEASON_GAME_TYPES.join(','),
    hydrate: 'team,venue,linescore',
  });
}

function mergeGames(payloads) {
  const gamesByPk = new Map();

  for (const payload of payloads) {
    for (const game of extractGames(payload)) {
      const gamePk = numberOrNull(game.gamePk);
      if (gamePk) gamesByPk.set(gamePk, game);
    }
  }

  return [...gamesByPk.values()].sort((first, second) => {
    return String(first.gameDate ?? '').localeCompare(
      String(second.gameDate ?? ''),
    );
  });
}

async function importBoxscore(client, game, batchSize) {
  const now = new Date().toISOString();
  const gamePk = numberOrNull(game.gamePk);

  if (!gamePk) throw new Error('Cannot import a game without gamePk.');

  const boxscore = await fetchMlb(`/game/${gamePk}/boxscore`);
  const parsed = parseBoxscore(boxscore, gamePk, now);

  await upsertRows(
    client,
    'mlb_teams',
    uniqueBy(parsed.teamEntities, 'team_id'),
    'team_id',
    batchSize,
  );
  await upsertRows(
    client,
    'mlb_players',
    uniqueBy(parsed.playerEntities, 'player_id'),
    'player_id',
    batchSize,
  );
  await upsertRows(
    client,
    'mlb_game_team_stats',
    parsed.teamStats,
    'game_pk,team_id',
    batchSize,
  );
  await upsertRows(
    client,
    'mlb_game_player_stats',
    parsed.players,
    'game_pk,player_id,team_id',
    batchSize,
  );
  await upsertRows(
    client,
    'mlb_source_payloads',
    [
      {
        game_pk: gamePk,
        payload_type: 'boxscore',
        payload: boxscore,
        fetched_at: now,
      },
    ],
    'game_pk,payload_type',
    batchSize,
  );
}

async function runWithConcurrency(items, concurrency, worker) {
  let nextIndex = 0;
  let completed = 0;
  const failures = [];

  async function consume() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];

      try {
        await worker(item);
        completed += 1;

        if (completed % 25 === 0 || completed === items.length) {
          console.log(
            `Processed ${completed}/${items.length} finalized games.`,
          );
        }
      } catch (error) {
        failures.push({
          gamePk: item.gamePk,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`Failed game ${item.gamePk}: ${failures.at(-1).error}`);
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => consume()));

  return { completed, failures };
}

function gameIsInDateRange(game, startDate) {
  const officialDate = game.officialDate ?? game.gameDate?.slice(0, 10);
  return officialDate ? officialDate >= startDate : false;
}

function shouldImportBoxscore(game, mode, regularStartDate) {
  if (!isFinalGame(game)) return false;
  if (mode === 'backfill') return true;

  return isPostseasonGame(game) || gameIsInDateRange(game, regularStartDate);
}

function errorDetails(error) {
  return [
    {
      message: error instanceof Error ? error.message : String(error),
      recorded_at: new Date().toISOString(),
    },
  ];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const season = requireInteger(
    options.season ?? process.env.MLB_SEASON ?? DEFAULT_SEASON,
    'season',
    { minimum: 1876 },
  );
  const mode = options.mode ?? process.env.MLB_MODE ?? 'backfill';

  if (mode !== 'backfill' && mode !== 'sync') {
    throw new Error('mode must be either backfill or sync.');
  }

  const concurrency = requireInteger(
    options.concurrency ?? DEFAULT_CONCURRENCY,
    'concurrency',
    { minimum: 1 },
  );
  const batchSize = requireInteger(
    options['batch-size'] ?? DEFAULT_BATCH_SIZE,
    'batch-size',
    {
      minimum: 1,
    },
  );
  const { startDate, endDate } = getDateRange(options, season, mode);
  const dryRun = options['dry-run'] === true;
  const client = dryRun ? null : createSupabaseClient();
  let runId = null;
  let gamesFound = 0;
  let gamesProcessed = 0;
  let gamesSkipped = 0;
  let failures = [];

  console.log(
    `Starting MLB ${season} ${mode}: regular games ${startDate} through ${endDate}; ` +
      `postseason types ${POSTSEASON_GAME_TYPES.join(', ')}.`,
  );

  try {
    if (client) runId = await startIngestRun(client, season, mode);

    const regularPayloads = await fetchRegularGames(season, startDate, endDate);
    const postseasonPayload = await fetchPostseasonGames(season);
    const regularGames = mergeGames(regularPayloads);
    const postseasonGames = mergeGames([postseasonPayload]);
    const games = mergeGames([...regularPayloads, postseasonPayload]);
    const now = new Date().toISOString();
    const gameRows = games.map((game) => gameRow(game, season, now));
    const teamRows = uniqueBy(
      games.flatMap((game) => [
        teamRow(game.teams?.away, now),
        teamRow(game.teams?.home, now),
      ]),
      'team_id',
    );
    const schedulePayloadRows = games
      .filter((game) => numberOrNull(game.gamePk))
      .map((game) => ({
        game_pk: numberOrNull(game.gamePk),
        payload_type: 'schedule',
        payload: game,
        fetched_at: now,
      }));

    gamesFound = games.length;

    if (regularGames.length || postseasonGames.length) {
      console.log(
        `Discovered ${regularGames.length} regular-season and ` +
          `${postseasonGames.length} postseason schedule games (${games.length} unique).`,
      );
    }

    if (client) {
      await upsertRows(client, 'mlb_teams', teamRows, 'team_id', batchSize);
      await upsertRows(client, 'mlb_games', gameRows, 'game_pk', batchSize);
      await upsertRows(
        client,
        'mlb_source_payloads',
        schedulePayloadRows,
        'game_pk,payload_type',
        batchSize,
      );
      await updateIngestRun(client, runId, { games_found: gamesFound });
    }

    const gamesToProcess = games.filter((game) =>
      shouldImportBoxscore(game, mode, startDate),
    );
    gamesSkipped = games.length - gamesToProcess.length;

    console.log(
      `${gamesToProcess.length} finalized games selected for boxscore import; ` +
        `${gamesSkipped} scheduled or out-of-window games skipped.`,
    );

    if (dryRun) {
      console.log('Dry run complete; no Supabase writes were performed.');
      return;
    }

    const result = await runWithConcurrency(
      gamesToProcess,
      concurrency,
      (game) => importBoxscore(client, game, batchSize),
    );

    gamesProcessed = result.completed;
    failures = result.failures;

    await updateIngestRun(client, runId, {
      status: failures.length > 0 ? 'failed' : 'completed',
      finished_at: new Date().toISOString(),
      games_found: gamesFound,
      games_processed: gamesProcessed,
      games_skipped: gamesSkipped,
      error_details: failures,
    });

    if (failures.length > 0) {
      throw new Error(`${failures.length} finalized games failed to import.`);
    }

    console.log(`MLB import complete: ${gamesProcessed} games processed.`);
  } catch (error) {
    if (client && runId) {
      try {
        await updateIngestRun(client, runId, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          games_found: gamesFound,
          games_processed: gamesProcessed,
          games_skipped: gamesSkipped,
          error_details: [...failures, ...errorDetails(error)],
        });
      } catch (updateError) {
        console.error(
          `Could not record failed ingest run: ${
            updateError instanceof Error
              ? updateError.message
              : String(updateError)
          }`,
        );
      }
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

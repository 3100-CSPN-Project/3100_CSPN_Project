// Convert an optional MLB/Supabase value to a finite number. Invalid or empty
// values become null so they do not contaminate an aggregate.
function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Safely read a JSON stats object. Missing or non-object values become {}.
function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

// The API is intentionally limited to regular-season data by default.
export const DEFAULT_GAME_TYPE = 'R';
// These identify the default on-demand split returned by the read layer.
export const DEFAULT_SPLIT_TYPE = 'last_games';
export const DEFAULT_SPLIT_VALUE = '7';
// The split combinations the aggregator can produce for one player.
export const SUPPORTED_GAME_SPLITS = Object.freeze([
  { split_type: 'season', split_value: 'season' },
  { split_type: 'last_games', split_value: '7' },
  { split_type: 'last_games', split_value: '14' },
  { split_type: 'month' },
]);

// Rate stats must be recalculated from totals; adding per-game averages would
// produce incorrect season or rolling values.
const RATE_STAT_KEYS = new Set([
  'avg',
  'obp',
  'slg',
  'ops',
  'babip',
  'era',
  'whip',
  'strikePercentage',
  'stolenBasePercentage',
  'caughtStealingPercentage',
  'fielding',
  'fieldingPercentage',
  'rangeFactorPerGame',
  'rangeFactorPer9Inn',
  'groundOutsToAirouts',
  'pitchesPerInning',
]);

// These fields describe a game or lineup position and cannot be added.
const NON_ADDITIVE_STAT_KEYS = new Set([
  'gameScore',
  'position',
  'battingOrder',
  'rank',
]);

// Parse a value only when it is a usable finite number.
function finiteNumber(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Round calculated rates for stable API output.
function round(value, digits = 3) {
  if (!Number.isFinite(value)) return null;

  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// MLB represents innings as baseball notation: 1.2 means 1 inning and 2
// outs, not the decimal number 1.2. Convert to outs before adding innings.
function inningsToOuts(value) {
  if (value === undefined || value === null || value === '') return null;

  const text = String(value);
  const [wholeText, fractionText] = text.split('.');
  const whole = Number(wholeText);

  if (!Number.isFinite(whole)) return null;

  if (/^[012]$/.test(fractionText ?? '')) {
    return whole * 3 + Number(fractionText ?? 0);
  }

  const decimalValue = Number(value);
  return Number.isFinite(decimalValue) ? Math.round(decimalValue * 3) : null;
}

// Convert total outs back to MLB's innings notation for the response.
function outsToInnings(outs) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

// Use zero when a counting stat is missing from a game row.
function numberOrZero(value) {
  return finiteNumber(value) ?? 0;
}

// Add a calculated rate only when its denominator produced a valid result.
function setDerivedRate(stats, key, value, digits = 3) {
  if (Number.isFinite(value)) stats[key] = round(value, digits);
}

// Recalculate batting average, slugging, OBP, OPS, and stolen-base rate from
// the summed counting stats.
function deriveBattingRates(stats) {
  const atBats = numberOrZero(stats.atBats);
  const hits = numberOrZero(stats.hits);
  const walks = numberOrZero(stats.baseOnBalls);
  const hitByPitch = numberOrZero(stats.hitByPitch);
  const sacFlies = numberOrZero(stats.sacFlies);

  if (atBats > 0) {
    setDerivedRate(stats, 'avg', hits / atBats);

    const singles =
      hits -
      numberOrZero(stats.doubles) -
      numberOrZero(stats.triples) -
      numberOrZero(stats.homeRuns);
    const totalBases =
      finiteNumber(stats.totalBases) ??
      singles +
        2 * numberOrZero(stats.doubles) +
        3 * numberOrZero(stats.triples) +
        4 * numberOrZero(stats.homeRuns);
    const onBaseDenominator = atBats + walks + hitByPitch + sacFlies;

    stats.totalBases = totalBases;
    setDerivedRate(stats, 'slg', totalBases / atBats);
    if (onBaseDenominator > 0) {
      setDerivedRate(
        stats,
        'obp',
        (hits + walks + hitByPitch) / onBaseDenominator,
      );
    }
  }

  if (Number.isFinite(stats.obp) && Number.isFinite(stats.slg)) {
    setDerivedRate(stats, 'ops', stats.obp + stats.slg);
  }

  const stolenBases = finiteNumber(stats.stolenBases);
  const caughtStealing = finiteNumber(stats.caughtStealing);
  if (stolenBases !== null && caughtStealing !== null) {
    const attempts = stolenBases + caughtStealing;
    if (attempts > 0) {
      setDerivedRate(stats, 'stolenBasePercentage', stolenBases / attempts);
    }
  }
}

// Recalculate pitching rates from earned runs, hits, walks, pitches, and the
// already-normalized innings total.
function derivePitchingRates(stats, inningsOuts) {
  if (inningsOuts > 0) {
    const earnedRuns = numberOrZero(stats.earnedRuns);
    const hits = numberOrZero(stats.hits);
    const walks = numberOrZero(stats.baseOnBalls);
    const pitches = numberOrZero(stats.numberOfPitches);
    const strikes = numberOrZero(stats.strikes);
    const innings = inningsOuts / 3;

    setDerivedRate(stats, 'era', (earnedRuns * 9) / innings, 2);
    setDerivedRate(stats, 'whip', ((walks + hits) * 3) / innings, 2);
    if (pitches > 0)
      setDerivedRate(stats, 'strikePercentage', strikes / pitches);
    setDerivedRate(stats, 'pitchesPerInning', pitches / innings, 2);
  }

  const groundOuts = finiteNumber(stats.groundOuts);
  const airOuts = finiteNumber(stats.airOuts);
  if (groundOuts !== null && airOuts !== null && airOuts > 0) {
    setDerivedRate(stats, 'groundOutsToAirouts', groundOuts / airOuts, 2);
  }
}

// Recalculate fielding percentage from putouts, assists, errors, or chances.
function deriveFieldingRates(stats) {
  const putOuts = numberOrZero(stats.putOuts);
  const assists = numberOrZero(stats.assists);
  const errors = numberOrZero(stats.errors);
  const chances = finiteNumber(stats.chances) ?? putOuts + assists + errors;

  if (chances > 0) {
    setDerivedRate(stats, 'fielding', (putOuts + assists) / chances);
  }
}

/**
 * Add the numeric counting stats in one MLB stats group across game rows.
 * Rate and descriptive fields are skipped, then the appropriate rates are
 * recalculated from the totals. Used for batting, pitching, and fielding.
 */
export function sumStatGroup(rows, groupName) {
  const totals = {};
  let inningsOuts = 0;
  let hasInningsPitched = false;

  for (const row of rows) {
    const stats = objectOrEmpty(row[groupName]);

    for (const [key, value] of Object.entries(stats)) {
      if (key === 'inningsPitched') {
        const outs = inningsToOuts(value);
        if (outs !== null) {
          inningsOuts += outs;
          hasInningsPitched = true;
        }
        continue;
      }

      if (RATE_STAT_KEYS.has(key) || NON_ADDITIVE_STAT_KEYS.has(key)) continue;

      const numericValue = finiteNumber(value);
      if (numericValue !== null) {
        totals[key] = (totals[key] ?? 0) + numericValue;
      }
    }
  }

  if (hasInningsPitched) totals.inningsPitched = outsToInnings(inningsOuts);

  if (groupName === 'batting_stats') deriveBattingRates(totals);
  if (groupName === 'pitching_stats') derivePitchingRates(totals, inningsOuts);
  if (groupName === 'fielding_stats') deriveFieldingRates(totals);

  return totals;
}

// Normalize an official game date to YYYY-MM-DD for sorting and month splits.
function dateKey(value) {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

// Reject rows that cannot be aggregated or that do not belong to the requested
// season, game type, or finalized-game set.
function normalizeRecord(record, season, gameType) {
  const game = record.game ?? record.mlb_games ?? {};
  const recordSeason = numberOrNull(game.season);
  const date = dateKey(record.official_date ?? game.official_date);
  const gamePk = numberOrNull(record.game_pk);

  if (!gamePk || !date) return null;
  if (recordSeason !== null && recordSeason !== season) return null;
  if (game.is_final === false) return null;
  if (game.game_type && game.game_type !== gameType) return null;

  return { ...record, game, date, game_pk: gamePk };
}

// Order player-game rows chronologically, using gamePk as a stable tie-breaker.
function sortRecords(records) {
  return [...records].sort((first, second) => {
    return `${first.date}-${first.game_pk}`.localeCompare(
      `${second.date}-${second.game_pk}`,
    );
  });
}

// Select a player's most recent N distinct games. A player may have multiple
// stats rows for one game, so the window is based on gamePk rather than rows.
function latestGames(records, count) {
  const gamePks = [];

  for (const record of sortRecords(records).reverse()) {
    if (!gamePks.includes(record.game_pk)) gamePks.push(record.game_pk);
    if (gamePks.length === count) break;
  }

  const includedGames = new Set(gamePks);
  return records.filter((record) => includedGames.has(record.game_pk));
}

// Group a player's finalized game rows by calendar month.
function byMonth(records) {
  const recordsByMonth = new Map();

  for (const record of records) {
    const month = record.date.slice(0, 7);
    const monthRecords = recordsByMonth.get(month) ?? [];
    monthRecords.push(record);
    recordsByMonth.set(month, monthRecords);
  }

  return recordsByMonth;
}

// Return deduplicated numeric values such as team IDs and source game IDs.
// Callers sort the result when response ordering matters.
function uniqueValues(records, property) {
  return [
    ...new Set(
      records
        .map((record) => numberOrNull(record[property]))
        .filter((value) => value !== null),
    ),
  ];
}

// Convert aggregate counting stats to integer API fields while preserving null.
function integerOrNull(value) {
  const parsed = finiteNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

// Shape one player's aggregated records into the public stats response. The
// row is calculated in memory and is not written to Supabase.
function createPlayerSplitRow(
  playerId,
  records,
  season,
  gameType,
  splitType,
  splitValue,
  now,
) {
  const orderedRecords = sortRecords(records);
  const batting = sumStatGroup(orderedRecords, 'batting_stats');
  const pitching = sumStatGroup(orderedRecords, 'pitching_stats');
  const fielding = sumStatGroup(orderedRecords, 'fielding_stats');
  const sourceGamePks = uniqueValues(orderedRecords, 'game_pk').sort(
    (first, second) => first - second,
  );

  return {
    season,
    game_type: gameType,
    player_id: playerId,
    split_type: splitType,
    split_value: splitValue,
    start_date: orderedRecords[0].date,
    end_date: orderedRecords.at(-1).date,
    games: sourceGamePks.length,
    at_bats: integerOrNull(batting.atBats),
    runs: integerOrNull(batting.runs),
    hits: integerOrNull(batting.hits),
    home_runs: integerOrNull(batting.homeRuns),
    rbi: integerOrNull(batting.rbi),
    stolen_bases: integerOrNull(batting.stolenBases),
    batting_average: batting.avg ?? null,
    obp: batting.obp ?? null,
    ops: batting.ops ?? null,
    wins: integerOrNull(pitching.wins),
    losses: integerOrNull(pitching.losses),
    era: pitching.era ?? null,
    games_started: integerOrNull(pitching.gamesStarted),
    saves: integerOrNull(pitching.saves),
    innings_pitched: pitching.inningsPitched ?? null,
    strikeouts: integerOrNull(pitching.strikeOuts),
    whip: pitching.whip ?? null,
    team_ids: uniqueValues(orderedRecords, 'team_id').sort(
      (first, second) => first - second,
    ),
    batting_stats: batting,
    pitching_stats: pitching,
    fielding_stats: fielding,
    source_game_pks: sourceGamePks,
    calculated_at: now,
  };
}

/**
 * Build all supported split responses from normalized player-game rows.
 *
 * Input rows are grouped by player, then each player receives a season row,
 * last-7 row, last-14 row, and one row per calendar month. This is the main
 * on-demand ingestion function used by src/lib/mlbStats.ts.
 */
export function buildPlayerStatSplitRows(
  records,
  season,
  now = new Date().toISOString(),
  { gameType = DEFAULT_GAME_TYPE } = {},
) {
  const normalizedRecords = records
    .map((record) => normalizeRecord(record, season, gameType))
    .filter(Boolean);
  const recordsByPlayer = new Map();

  for (const record of normalizedRecords) {
    const playerId = numberOrNull(record.player_id);
    if (playerId === null) continue;

    const playerRecords = recordsByPlayer.get(playerId) ?? [];
    playerRecords.push(record);
    recordsByPlayer.set(playerId, playerRecords);
  }

  const rows = [];

  for (const [playerId, playerRecords] of recordsByPlayer) {
    rows.push(
      createPlayerSplitRow(
        playerId,
        playerRecords,
        season,
        gameType,
        'season',
        'season',
        now,
      ),
    );
    rows.push(
      createPlayerSplitRow(
        playerId,
        latestGames(playerRecords, 7),
        season,
        gameType,
        'last_games',
        '7',
        now,
      ),
    );
    rows.push(
      createPlayerSplitRow(
        playerId,
        latestGames(playerRecords, 14),
        season,
        gameType,
        'last_games',
        '14',
        now,
      ),
    );

    for (const [month, monthRecords] of byMonth(playerRecords)) {
      rows.push(
        createPlayerSplitRow(
          playerId,
          monthRecords,
          season,
          gameType,
          'month',
          month,
          now,
        ),
      );
    }
  }

  return rows;
}

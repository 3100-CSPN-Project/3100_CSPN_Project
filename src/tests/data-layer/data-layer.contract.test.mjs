import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { createFixtures, SEASON } from './fixtures.mjs';
import { createInMemorySupabase } from './in-memory-supabase.mjs';
import { createMockSupabase } from './mock-supabase.mjs';
import * as dataStore from '../../../scripts/mlb/dataStore.mjs';

const getSupabaseClient = jest.fn();
await jest.unstable_mockModule(
  '../../../.test-build/src/lib/supabase.js',
  () => ({
    getSupabaseClient,
  }),
);

const [games, previews, comments, teams, players, stats, images] =
  await Promise.all([
    import('../../../.test-build/src/lib/mlbGames.js'),
    import('../../../.test-build/src/lib/mlbPreviews.js'),
    import('../../../.test-build/src/lib/gameComments.js'),
    import('../../../.test-build/src/lib/mlbTeams.js'),
    import('../../../.test-build/src/lib/mlbPlayers.js'),
    import('../../../.test-build/src/lib/mlbStats.js'),
    import('../../../.test-build/src/lib/mlbImages.js'),
  ]);

const suiteTimings = {};
const backendTypes = [
  {
    name: 'in-memory Supabase database',
    create: (fixtures) => createInMemorySupabase(fixtures),
  },
  {
    name: 'Jest mock objects',
    create: (fixtures) => createMockSupabase(fixtures, jest),
  },
];

function expectMockOperation(backend, table, method, args) {
  if (backend.database) return;
  const query = backend.calls.queries.find(
    (candidate) =>
      candidate.table === table &&
      candidate.operations.some((operation) => operation.method === method),
  );
  expect(query?.operations).toContainEqual({ method, args });
}

describe.each(backendTypes)('$name data-layer contract', ({ name, create }) => {
  let backend;
  let startedAt;

  beforeAll(async () => {
    startedAt = performance.now();
    backend = await create(createFixtures());
  });

  beforeEach(async () => {
    await backend.reset?.(createFixtures());
    getSupabaseClient.mockReset().mockReturnValue(backend.client);
  });

  afterAll(async () => {
    await backend.close?.();
    const elapsedMs = performance.now() - startedAt;
    suiteTimings[name] = elapsedMs;
    console.info(`DATA_LAYER_SUITE_TIME ${name}: ${elapsedMs.toFixed(2)} ms`);

    if (Object.keys(suiteTimings).length === backendTypes.length) {
      const memoryMs = suiteTimings['in-memory Supabase database'];
      const mocksMs = suiteTimings['Jest mock objects'];
      const faster = memoryMs < mocksMs ? 'in-memory database' : 'Jest mocks';
      const ratio =
        Math.max(memoryMs, mocksMs) /
        Math.max(0.01, Math.min(memoryMs, mocksMs));
      console.info(
        `DATA_LAYER_TIMING_COMPARISON in-memory=${memoryMs.toFixed(2)}ms ` +
          `mocks=${mocksMs.toFixed(2)}ms; ${faster} was ${ratio.toFixed(2)}x faster in this run`,
      );
    }
  });

  it('reads a game with its home and away team models', async () => {
    backend.prepare('game.detail');

    const { data, error } = await games.getMlbGame('1001');

    expect(error).toBeNull();
    expect(data.status_abstract).toBe('Final');
    expect(data.home_team).toEqual({ team_name: 'Yankees' });
    expect(data.away_team).toEqual({ team_name: 'Red Sox' });
    expect(data.linescore.innings[0].home.runs).toBe(1);
  });

  it('reads team and player box-score models for one game', async () => {
    backend.prepare('game.boxscore');

    const boxScore = await games.getMlbGameBoxScore('1001');

    expect(boxScore.teams).toHaveLength(2);
    expect(boxScore.teams[0]).toMatchObject({
      team_id: 147,
      side: 'home',
      batting_stats: { runs: 5 },
    });
    expect(boxScore.players).toHaveLength(2);
    expect(boxScore.players[0]).toMatchObject({
      player_id: 501,
      player: { full_name: 'Aaron Example' },
    });
  });

  it('finds the next scheduled game for a team', async () => {
    backend.prepare('game.next');

    const nextGame = await games.getMlbNextGameForTeam(147, SEASON);

    expect(nextGame).toMatchObject({
      gamePk: 2001,
      homeTeamName: 'Yankees',
      awayTeamName: 'Red Sox',
    });
    expect(nextGame.officialDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('reads upcoming, past, and live game preview models', async () => {
    backend.prepare('previews.groups');

    const [upcomingResult, pastResult, liveResult] = await Promise.all([
      previews.getUpcomingGamePreviews(),
      previews.getPastGamePreviews(),
      previews.getLiveGamePreviews(),
    ]);
    const { data: upcoming, error: upcomingError } = upcomingResult;
    const { data: past, error: pastError } = pastResult;
    const { data: live, error: liveError } = liveResult;

    expect(upcomingError).toBeNull();
    expect(pastError).toBeNull();
    expect(liveError).toBeNull();
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]).toMatchObject({
      game_pk: 2001,
      status_abstract: 'Preview',
      home_team: { team_name: 'Yankees' },
    });
    expect(past[0]).toMatchObject({
      game_pk: 1003,
      status_abstract: 'Final',
      away_team: { team_name: 'Blue Jays' },
    });
    expect(live[0]).toMatchObject({
      game_pk: 2002,
      status_abstract: 'In Progress',
      linescore: { currentInningOrdinal: '5th' },
    });
  });

  it('lists comments, inserts one, and sees the inserted comment', async () => {
    backend.prepare('comments.lifecycle');

    const before = await comments.getGameComments('1001');
    await comments.postGameComment('1001', 'Alex', 'Nice hit!');
    const after = await comments.getGameComments('1001');

    expect(before).toHaveLength(2);
    expect(before[0]).toEqual({
      comment_id: 1,
      author: 'Sam',
      body: 'Great start!',
    });
    expect(after).toHaveLength(3);
    expect(after[2]).toEqual({
      comment_id: 3,
      author: 'Alex',
      body: 'Nice hit!',
    });
    expectMockOperation(backend, 'game_comments', 'insert', [
      { game_pk: '1001', author: 'Alex', body: 'Nice hit!' },
    ]);
  });

  it('enforces comment length and game foreign-key constraints', async () => {
    backend.prepare('comments.constraints');
    if (!backend.database) {
      backend.failNext(
        'game_comments',
        'new row violates check constraint "game_comments_author_check"',
        '23514',
      );
      backend.failNext(
        'game_comments',
        'insert violates foreign key constraint "game_comments_game_pk_fkey"',
        '23503',
      );
    }

    await expect(
      comments.postGameComment('1001', 'A'.repeat(41), 'Too long'),
    ).rejects.toThrow(/constraint/i);
    await expect(
      comments.postGameComment('99999', 'Alex', 'Unknown game'),
    ).rejects.toThrow(/constraint/i);
  });

  it('upserts every MLB model in batches and reports database errors', async () => {
    backend.prepare('persistence.upserts');

    const rowsByModel = [
      [
        'mlb_teams',
        [
          { team_id: 147, name: 'Updated Yankees' },
          { team_id: 111, name: 'Updated Red Sox' },
        ],
        'team_id',
      ],
      [
        'mlb_players',
        [{ player_id: 501, full_name: 'Aaron Example' }],
        'player_id',
      ],
      [
        'mlb_games',
        [{ game_pk: 1001, season: SEASON, game_type: 'R' }],
        'game_pk',
      ],
      [
        'mlb_game_team_stats',
        [
          {
            game_pk: 1001,
            team_id: 147,
            side: 'home',
            batting_stats: { runs: 8 },
          },
        ],
        'game_pk,team_id',
      ],
      [
        'mlb_game_player_stats',
        [
          {
            game_pk: 1001,
            player_id: 501,
            team_id: 147,
            side: 'home',
            batting_stats: { hits: 3 },
          },
        ],
        'game_pk,player_id,team_id',
      ],
      [
        'mlb_source_payloads',
        [
          {
            game_pk: 1001,
            payload_type: 'schedule',
            payload: { gamePk: 1001 },
          },
        ],
        'game_pk,payload_type',
      ],
    ];

    for (const [table, rows, conflictKey] of rowsByModel) {
      await dataStore.upsertRows(backend.client, table, rows, conflictKey, 1);
    }

    const { data: changedTeam } = await backend.client
      .from('mlb_teams')
      .select('team_id, name')
      .eq('team_id', 147)
      .single();
    expect(changedTeam).toEqual({ team_id: 147, name: 'Updated Yankees' });
    expectMockOperation(backend, 'mlb_teams', 'upsert', [
      [{ team_id: 147, name: 'Updated Yankees' }],
      { onConflict: 'team_id' },
    ]);

    backend.failNext('mlb_teams', 'write unavailable');
    await expect(
      dataStore.upsertRows(
        backend.client,
        'mlb_teams',
        [{ team_id: 147, name: 'Updated Yankees' }],
        'team_id',
        1,
      ),
    ).rejects.toThrow(
      'Supabase upsert failed for mlb_teams: write unavailable',
    );
  });

  it('treats an empty upsert batch as a no-op', async () => {
    backend.prepare('persistence.upserts');

    await expect(
      dataStore.upsertRows(backend.client, 'mlb_teams', [], 'team_id', 100),
    ).resolves.toBeUndefined();
    expect(backend.calls.queries).toHaveLength(0);
  });

  it('creates and updates an ingest run', async () => {
    backend.prepare('persistence.ingest-run');

    const runId = await dataStore.startIngestRun(
      backend.client,
      SEASON,
      'sync',
    );
    await dataStore.updateIngestRun(backend.client, runId, {
      status: 'completed',
      games_found: 3,
      games_processed: 3,
      error_details: [],
    });
    const { data } = await backend.client
      .from('mlb_ingest_runs')
      .select('run_id, season, status, games_found')
      .eq('run_id', runId)
      .single();

    expect(data).toMatchObject({
      run_id: runId,
      season: SEASON,
      status: 'completed',
      games_found: 3,
    });
    expectMockOperation(backend, 'mlb_ingest_runs', 'insert', [
      { season: SEASON, mode: 'sync', status: 'running' },
    ]);
    expectMockOperation(backend, 'mlb_ingest_runs', 'update', [
      {
        status: 'completed',
        games_found: 3,
        games_processed: 3,
        error_details: [],
      },
    ]);
  });

  it('finds pending image models and saves Cloudinary delivery data', async () => {
    backend.prepare('images.sync');
    const target = {
      table: 'mlb_teams',
      idColumn: 'team_id',
      urlColumn: 'logo_url',
      publicIdColumn: 'logo_public_id',
    };

    const pendingIds = await dataStore.fetchPendingImageIds(
      backend.client,
      target,
    );
    await dataStore.saveUploadedImage(backend.client, target, 111, {
      secure_url: 'https://cdn.example.test/teams/111.svg',
      public_id: '111',
    });
    const { data } = await backend.client
      .from('mlb_teams')
      .select('team_id, logo_url, logo_public_id')
      .eq('team_id', 111)
      .single();

    expect(pendingIds).toEqual([111, 141]);
    expect(data).toEqual({
      team_id: 111,
      logo_url: 'https://cdn.example.test/teams/111.svg',
      logo_public_id: '111',
    });
    expectMockOperation(backend, 'mlb_teams', 'is', ['logo_url', null]);
    expectMockOperation(backend, 'mlb_teams', 'update', [
      {
        logo_url: 'https://cdn.example.test/teams/111.svg',
        logo_public_id: '111',
      },
    ]);
  });

  it('calculates the latest team season records', async () => {
    backend.prepare('teams.records');

    const { season, records } = await teams.getMlbTeamSeasonRecords();

    expect(season).toBe(SEASON);
    expect(records.get(147)).toEqual({ wins: 1, losses: 1, ties: 1 });
    expect(records.get(111)).toEqual({ wins: 1, losses: 1, ties: 0 });
    expect(records.get(141)).toEqual({ wins: 0, losses: 0, ties: 1 });
  });

  it('builds a team page with standings, roster splits, and recent games', async () => {
    backend.prepare('teams.page');

    const page = await teams.getMlbTeamPageData(147);

    expect(page).toMatchObject({
      team: { teamId: 147, name: 'Yankees', abbreviation: 'NYY' },
      season: SEASON,
      wins: 1,
      losses: 1,
      ties: 1,
      standing: '2nd in AL East',
    });
    expect(page.positionPlayers.map((player) => player.playerId)).toEqual([
      501,
    ]);
    expect(page.pitchers.map((player) => player.playerId)).toEqual([502]);
    expect(page.recentGames[0]).toMatchObject({
      gamePk: 1003,
      opponent: 'Blue Jays',
      result: 'T',
    });
  });

  it('reads a player, the directory, search results, and random teammates', async () => {
    backend.prepare('players.operations');

    const player = await players.getMlbPlayer(501);
    const directory = await players.getMlbPlayers(2);
    const search = await players.searchMlbPlayers('  Aaron  ', 5);
    const teammates = await players.getRandomMlbTeammates(147, 501, SEASON, 3);
    const emptySearch = await players.searchMlbPlayers('   ');

    expect(player).toMatchObject({
      playerId: 501,
      fullName: 'Aaron Example',
      batSide: 'L',
    });
    expect(directory.map((item) => item.fullName)).toEqual([
      'Aaron Example',
      'Blake Example',
    ]);
    expect(search[0]).toMatchObject({ playerId: 501 });
    expect(search[0].rank).toBeGreaterThan(0);
    expect(teammates).toEqual([
      expect.objectContaining({ playerId: 502, fullName: 'Blake Example' }),
    ]);
    expect(emptySearch).toEqual([]);
  });

  it('builds player season splits and a profile game log', async () => {
    backend.prepare('stats.operations');

    const defaultSplit = await stats.getMlbPlayerStats({
      season: SEASON,
      playerId: 501,
    });
    const seasonSplit = await stats.getMlbPlayerStats({
      season: SEASON,
      split: 'season',
      playerId: 501,
    });
    const profile = await stats.getMlbPlayerProfileStats(501, SEASON);

    expect(defaultSplit[0]).toMatchObject({
      split_type: 'last_games',
      split_value: '7',
      games: 1,
      at_bats: 4,
      hits: 2,
      home_runs: 1,
    });
    expect(seasonSplit[0].split_type).toBe('season');
    expect(profile.season).toMatchObject({ player_id: 501, games: 1, hits: 2 });
    expect(profile.gameLog[0]).toMatchObject({
      gamePk: 1001,
      teamName: 'Yankees',
      opponent: 'Red Sox',
      isHome: true,
      homeScore: 5,
      awayScore: 3,
    });
  });

  it('reads team logos and transforms Cloudinary URLs', async () => {
    backend.prepare('images.read');

    const logos = await images.getMlbTeamLogos();

    expect(logos[0]).toMatchObject({
      teamId: 111,
      name: 'Boston Red Sox',
      logoUrl: null,
    });
    expect(
      images.transformedImageUrl(
        'https://res.cloudinary.com/cspn/image/upload/v1/teams/147.svg',
        128,
      ),
    ).toBe(
      'https://res.cloudinary.com/cspn/image/upload/f_auto,q_auto,w_128/v1/teams/147.svg',
    );
    expect(
      images.transformedImageUrl('https://images.example.test/501.jpg'),
    ).toBe('https://images.example.test/501.jpg');
    expect(images.transformedImageUrl(null)).toBeUndefined();
  });

  it('returns empty or missing models for absent rows and empty queries', async () => {
    await backend.clear();
    backend.prepare('empty.results');

    expect(await players.getMlbPlayer(999)).toBeNull();
    expect(await games.getMlbNextGameForTeam(147, SEASON)).toBeNull();
    expect(await teams.getMlbTeamPageData(999)).toBeNull();
    expect(await teams.getMlbTeamSeasonRecords()).toEqual({
      season: null,
      records: new Map(),
    });
    expect(
      await stats.getMlbPlayerStats({ season: SEASON, playerId: 501 }),
    ).toEqual([]);
    expect(await players.searchMlbPlayers(' ')).toEqual([]);
  });

  it('propagates database errors from comments and box-score reads', async () => {
    backend.prepare('errors');
    backend.failNext('game_comments', 'comments are unavailable');
    backend.failNext('mlb_game_team_stats', 'team stats are unavailable');

    await expect(comments.getGameComments('1001')).rejects.toThrow(
      'comments are unavailable',
    );
    await expect(games.getMlbGameBoxScore('1001')).rejects.toThrow(
      'Could not read team stats for game 1001: team stats are unavailable',
    );
  });
});

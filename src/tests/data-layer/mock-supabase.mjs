import { joinedGame, joinedPlayerGame, SEASON } from './fixtures.mjs';

const ok = (data) => ({ data, error: null });
const failed = (message, code = 'MOCK_DB_ERROR') => ({
  data: null,
  error: { message, code },
});

function previewRow(fixtures, game, fields) {
  const row = joinedGame(fixtures, game);
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function makePlan(name, fixtures) {
  const finalGames = fixtures.mlb_games.filter((game) => game.is_final);
  const playerGameRows = fixtures.mlb_game_player_stats.map((row) =>
    joinedPlayerGame(fixtures, row),
  );
  const comments = fixtures.game_comments.map(
    ({ comment_id, author, body }) => ({
      comment_id,
      author,
      body,
    }),
  );

  switch (name) {
    case 'game.detail': {
      const game = fixtures.mlb_games.find((row) => row.game_pk === 1001);
      return {
        tables: {
          mlb_games: [
            ok(
              previewRow(fixtures, game, [
                'game_date',
                'status_abstract',
                'official_date',
                'is_final',
                'venue_name',
                'home_team_id',
                'home_team',
                'home_score',
                'away_team_id',
                'away_team',
                'away_score',
                'linescore',
              ]),
            ),
          ],
        },
      };
    }
    case 'game.boxscore':
      return {
        tables: {
          mlb_game_team_stats: [ok(fixtures.mlb_game_team_stats)],
          mlb_game_player_stats: [ok(playerGameRows)],
        },
      };
    case 'game.next': {
      const game = fixtures.mlb_games.find((row) => row.game_pk === 2001);
      return {
        tables: {
          mlb_games: [
            ok({
              game_pk: game.game_pk,
              official_date: game.official_date,
              home_team: { team_name: 'Yankees' },
              away_team: { team_name: 'Red Sox' },
            }),
          ],
        },
      };
    }
    case 'previews.groups': {
      const upcoming = fixtures.mlb_games
        .filter((game) => game.status_abstract === 'Preview')
        .map((game) =>
          previewRow(fixtures, game, [
            'game_pk',
            'status_abstract',
            'official_date',
            'home_team',
            'away_team',
          ]),
        );
      const past = fixtures.mlb_games
        .filter((game) => game.status_abstract === 'Final')
        .sort((first, second) =>
          second.official_date.localeCompare(first.official_date),
        )
        .map((game) =>
          previewRow(fixtures, game, [
            'game_pk',
            'status_abstract',
            'official_date',
            'home_team',
            'home_score',
            'away_team',
            'away_score',
          ]),
        );
      const live = fixtures.mlb_games
        .filter((game) => game.status_abstract === 'In Progress')
        .map((game) =>
          previewRow(fixtures, game, [
            'game_pk',
            'status_abstract',
            'official_date',
            'home_team',
            'home_score',
            'away_team',
            'away_score',
            'linescore',
          ]),
        );
      return { tables: { mlb_games: [ok(upcoming), ok(past), ok(live)] } };
    }
    case 'comments.lifecycle':
      return {
        tables: {
          game_comments: [
            ok(comments),
            ok(null),
            ok([
              ...comments,
              {
                comment_id: 3,
                author: 'Alex',
                body: 'Nice hit!',
              },
            ]),
          ],
        },
      };
    case 'comments.constraints':
      return { tables: { game_comments: [] } };
    case 'teams.records':
      return {
        tables: {
          mlb_games: [ok({ season: SEASON }), ok(finalGames)],
          mlb_teams: [
            ok(fixtures.mlb_teams.map(({ team_id }) => ({ team_id }))),
          ],
        },
      };
    case 'teams.page': {
      const team = fixtures.mlb_teams.find((row) => row.team_id === 147);
      const recentGames = finalGames
        .filter(
          (game) => game.home_team_id === 147 || game.away_team_id === 147,
        )
        .sort((first, second) =>
          second.official_date.localeCompare(first.official_date),
        )
        .slice(0, 4);
      return {
        tables: {
          mlb_teams: [ok(team), ok(fixtures.mlb_teams)],
          mlb_games: [ok({ season: SEASON }), ok(finalGames), ok(recentGames)],
          mlb_game_player_stats: [ok(playerGameRows)],
        },
      };
    }
    case 'players.operations': {
      const player = fixtures.mlb_players[0];
      const teammate = fixtures.mlb_players.find(
        (item) => item.player_id === 502,
      );
      return {
        tables: {
          mlb_players: [
            ok(player),
            ok(fixtures.mlb_players.slice(0, 2)),
            ok([teammate]),
          ],
          mlb_game_player_stats: [ok([{ player_id: teammate.player_id }])],
        },
        rpcs: [ok([{ ...player, rank: 0.1 }])],
      };
    }
    case 'stats.operations': {
      const battingRow = playerGameRows.find((row) => row.player_id === 501);
      return {
        tables: {
          mlb_game_player_stats: [
            ok([battingRow]),
            ok([battingRow]),
            ok([battingRow]),
          ],
        },
      };
    }
    case 'images.read':
      return {
        tables: {
          mlb_teams: [
            ok(
              fixtures.mlb_teams
                .map((team) => ({
                  team_id: team.team_id,
                  name: team.name,
                  logo_url: team.logo_url,
                  league_id: team.league_id,
                  division_id: team.division_id,
                }))
                .sort((first, second) => first.name.localeCompare(second.name)),
            ),
          ],
        },
      };
    case 'persistence.upserts':
      return {
        tables: {
          mlb_teams: [
            ok(null),
            ok(null),
            ok([{ team_id: 147, name: 'Updated Yankees' }]),
          ],
          mlb_players: [ok(null)],
          mlb_games: [ok(null)],
          mlb_game_team_stats: [ok(null)],
          mlb_game_player_stats: [ok(null)],
          mlb_source_payloads: [ok(null)],
        },
      };
    case 'persistence.ingest-run':
      return {
        tables: {
          mlb_ingest_runs: [
            ok({ run_id: 1 }),
            ok(null),
            ok([
              {
                run_id: 1,
                season: SEASON,
                status: 'completed',
                games_found: 3,
              },
            ]),
          ],
        },
      };
    case 'images.sync':
      return {
        tables: {
          mlb_teams: [
            ok([{ team_id: 111 }, { team_id: 141 }]),
            ok(null),
            ok([
              {
                team_id: 111,
                logo_url: 'https://cdn.example.test/teams/111.svg',
                logo_public_id: '111',
              },
            ]),
          ],
        },
      };
    case 'empty.results':
      return {
        tables: {
          mlb_players: [ok([])],
          mlb_games: [ok([]), ok([])],
          mlb_teams: [ok([])],
          mlb_game_player_stats: [ok([])],
        },
      };
    case 'errors':
      return {
        tables: {
          game_comments: [failed('comments are unavailable')],
          mlb_game_team_stats: [failed('team stats are unavailable')],
          mlb_game_player_stats: [ok([])],
        },
      };
    default:
      return { tables: {}, rpcs: [] };
  }
}

class MockQuery {
  constructor(backend, table) {
    this.backend = backend;
    this.table = table;
    this.mode = 'many';
    this.queryCalls = { table, operations: [] };
    backend.calls.queries.push(this.queryCalls);

    for (const method of [
      'select',
      'eq',
      'neq',
      'gte',
      'in',
      'is',
      'not',
      'or',
      'order',
      'limit',
      'range',
      'single',
      'maybeSingle',
      'overrideTypes',
      'insert',
      'update',
      'upsert',
    ]) {
      this[method] = backend.jest.fn((...args) => {
        this.queryCalls.operations.push({ method, args });
        if (method === 'single' || method === 'maybeSingle') this.mode = method;
        return this;
      });
    }

    this.then = backend.jest.fn((onFulfilled, onRejected) =>
      this.execute().then(onFulfilled, onRejected),
    );
  }

  async execute() {
    const response = this.backend.takeTableResponse(this.table);
    if (response.error || this.mode === 'many') return response;
    const rows = Array.isArray(response.data)
      ? response.data
      : response.data === null || response.data === undefined
        ? []
        : [response.data];

    if (rows.length === 0 && this.mode === 'maybeSingle') {
      return { data: null, error: null };
    }
    if (rows.length !== 1) {
      return {
        data: null,
        error: {
          code: 'PGRST116',
          message: `Expected one row, received ${rows.length}.`,
        },
      };
    }
    return { data: rows[0], error: null };
  }
}

export function createMockSupabase(fixtures, jest) {
  const backend = {
    jest,
    fixtures,
    calls: { from: null, rpc: null, queries: [] },
    tableQueues: new Map(),
    rpcQueue: [],
    prepare(name) {
      const plan = makePlan(name, fixtures);
      this.tableQueues = new Map(
        Object.entries(plan.tables ?? {}).map(([table, responses]) => [
          table,
          [...responses],
        ]),
      );
      this.rpcQueue = [...(plan.rpcs ?? [])];
    },
    takeTableResponse(table) {
      const queue = this.tableQueues.get(table);
      if (queue?.length) return queue.shift();
      return ok([]);
    },
    takeRpcResponse() {
      return this.rpcQueue.shift() ?? ok([]);
    },
    failNext(table, message, code = 'MOCK_DB_ERROR') {
      const queue = this.tableQueues.get(table) ?? [];
      queue.unshift(failed(message, code));
      this.tableQueues.set(table, queue);
    },
  };

  const client = {
    from: jest.fn((table) => {
      return new MockQuery(backend, table);
    }),
    rpc: jest.fn((name, args) => {
      backend.calls.rpcCalls.push({ name, args });
      return Promise.resolve(backend.takeRpcResponse());
    }),
  };
  backend.calls.from = client.from;
  backend.calls.rpc = client.rpc;
  backend.calls.rpcCalls = [];

  return {
    client,
    calls: backend.calls,
    prepare(name) {
      backend.calls.from.mockClear();
      backend.calls.rpc.mockClear();
      backend.calls.queries = [];
      backend.calls.rpcCalls = [];
      backend.prepare(name);
    },
    failNext(table, message, code) {
      backend.failNext(table, message, code);
    },
    clear() {},
  };
}

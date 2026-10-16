import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlayerStatSplitRows, sumStatGroup } from './aggregator.mjs';

function makeRecord(index) {
  const month = index < 5 ? '04' : '05';
  const day = String(index < 5 ? index + 1 : index - 4).padStart(2, '0');

  return {
    game_pk: 1000 + index,
    player_id: 42,
    team_id: 10,
    batting_stats: {
      atBats: 4,
      runs: 1,
      hits: 2,
      homeRuns: index === 14 ? 1 : 0,
      rbi: 2,
      stolenBases: 1,
      doubles: 1,
      totalBases: index === 14 ? 4 : 3,
      baseOnBalls: 1,
      sacFlies: 0,
    },
    pitching_stats: {
      wins: index === 14 ? 1 : 0,
      losses: 0,
      gamesStarted: 1,
      saves: 0,
      inningsPitched: '1.2',
      earnedRuns: 1,
      hits: 2,
      baseOnBalls: 1,
      strikeOuts: 3,
    },
    game: {
      season: 2026,
      official_date: `2026-${month}-${day}`,
      game_type: 'R',
      is_final: true,
    },
  };
}

test('sumStatGroup adds counting stats and recalculates rate stats', () => {
  const batting = sumStatGroup(
    [
      {
        batting_stats: {
          atBats: 4,
          hits: 2,
          doubles: 1,
          totalBases: 3,
          baseOnBalls: 1,
          sacFlies: 0,
          avg: '.500',
        },
      },
      {
        batting_stats: {
          atBats: 4,
          hits: 1,
          doubles: 0,
          totalBases: 1,
          baseOnBalls: 0,
          sacFlies: 0,
          avg: '.250',
        },
      },
    ],
    'batting_stats',
  );

  assert.equal(batting.atBats, 8);
  assert.equal(batting.hits, 3);
  assert.equal(batting.avg, 0.375);
  assert.equal(batting.obp, 0.444);
  assert.equal(batting.slg, 0.5);
  assert.equal(batting.ops, 0.944);
});

test('buildPlayerStatSplitRows creates season, rolling, and monthly rows', () => {
  const rows = buildPlayerStatSplitRows(
    [
      ...Array.from({ length: 15 }, (_, index) => makeRecord(index)),
      {
        ...makeRecord(99),
        game_pk: 1999,
        game: {
          ...makeRecord(99).game,
          game_type: 'P',
        },
      },
      {
        ...makeRecord(98),
        game_pk: 1998,
        game: {
          ...makeRecord(98).game,
          is_final: false,
        },
      },
    ],
    2026,
    '2026-10-15T12:00:00.000Z',
  );

  assert.equal(rows.length, 5);

  const season = rows.find((row) => row.split_value === 'season');
  assert.equal(season?.games, 15);
  assert.equal(season?.at_bats, 60);
  assert.equal(season?.hits, 30);
  assert.equal(season?.home_runs, 1);
  assert.equal(season?.batting_average, 0.5);
  assert.equal(season?.innings_pitched, '25.0');
  assert.equal(season?.strikeouts, 45);
  assert.equal(season?.games_started, 15);
  assert.equal(season?.wins, 1);
  assert.equal(season?.era, 5.4);
  assert.equal(season?.whip, 5.4);

  const last7 = rows.find(
    (row) => row.split_type === 'last_games' && row.split_value === '7',
  );
  assert.equal(last7?.games, 7);
  assert.deepEqual(
    last7?.source_game_pks,
    [1008, 1009, 1010, 1011, 1012, 1013, 1014],
  );

  const april = rows.find((row) => row.split_value === '2026-04');
  const may = rows.find((row) => row.split_value === '2026-05');
  assert.equal(april?.games, 5);
  assert.equal(may?.games, 10);
});

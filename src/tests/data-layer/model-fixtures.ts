import type {
  MlbGameBoxScore,
  MlbGameData,
  MlbGameLinescore,
  MlbGamePlayerStats,
  MlbGameTeamStats,
  MlbNextGame,
} from '../../lib/mlbGames';
import type { MlbPlayer, MlbPlayerSearchResult } from '../../lib/mlbPlayers';
import type {
  LiveGamePreviews,
  PastGamePreviews,
  UpcomingGamePreviews,
} from '../../lib/mlbPreviews';
import type {
  MlbPlayerProfileStats,
  MlbPlayerStatRow,
  MlbStatsQuery,
} from '../../lib/mlbStats';
import type { MlbTeamPageData, MlbTeamRecord } from '../../lib/mlbTeams';
import type { MlbTeamLogo } from '../../lib/mlbImages';
import type { GameComment } from '../../lib/gameComments';
import type {
  SupabaseClientOptions,
  SupabaseConfig,
  SupabaseEnv,
} from '../../lib/supabase';
import type { PlayerStatSplitRow } from '../../../scripts/mlb/aggregator.mjs';

const linescore = {
  inningState: 'End',
  currentInningOrdinal: '9th',
  outs: 0,
  innings: [
    {
      num: 9,
      ordinalNum: '9th',
      home: { runs: 1, hits: 2, errors: 0 },
      away: { runs: 0, hits: 1, errors: 1 },
    },
  ],
  teams: { home: { runs: 5 }, away: { runs: 3 } },
} satisfies MlbGameLinescore;

const teamStats = {
  team_id: 147,
  side: 'home',
  batting_stats: { runs: 5, hits: 8 },
  pitching_stats: { earnedRuns: 3, strikeOuts: 9 },
  fielding_stats: { errors: 0 },
} satisfies MlbGameTeamStats;

const playerStats = {
  player_id: 501,
  team_id: 147,
  side: 'home',
  jersey_number: '99',
  position_abbreviation: 'RF',
  batting_order: '3',
  batting_stats: { atBats: 4, hits: 2, homeRuns: 1 },
  pitching_stats: {},
  fielding_stats: { putOuts: 2 },
  player: { full_name: 'Aaron Example' },
} satisfies MlbGamePlayerStats;

const game = {
  status_abstract: 'Final',
  official_date: '2026-04-15',
  is_final: true,
  venue_name: 'Yankee Stadium',
  home_team: { team_name: 'Yankees' },
  home_team_id: '147',
  home_score: '5',
  away_team: { team_name: 'Red Sox' },
  away_team_id: '111',
  away_score: '3',
  linescore,
} satisfies MlbGameData;

const nextGame = {
  gamePk: 2001,
  officialDate: '2026-11-15',
  homeTeamName: 'Yankees',
  awayTeamName: 'Red Sox',
} satisfies MlbNextGame;

const player = {
  playerId: 501,
  fullName: 'Aaron Example',
  firstName: 'Aaron',
  lastName: 'Example',
  primaryPosition: 'RF',
  batSide: 'L',
  throwHand: 'R',
  imageUrl: null,
} satisfies MlbPlayer;

const searchResult = { ...player, rank: 0.1 } satisfies MlbPlayerSearchResult;

const statRow = {
  season: 2026,
  game_type: 'R',
  player_id: 501,
  split_type: 'season',
  split_value: 'season',
  start_date: '2026-04-15',
  end_date: '2026-04-15',
  games: 1,
  at_bats: 4,
  runs: 1,
  hits: 2,
  home_runs: 1,
  rbi: 3,
  stolen_bases: 0,
  batting_average: 0.5,
  obp: 0.6,
  ops: 1.85,
  wins: null,
  losses: null,
  era: null,
  games_started: null,
  saves: null,
  innings_pitched: null,
  strikeouts: null,
  whip: null,
  team_ids: [147],
  batting_stats: { atBats: 4, hits: 2 },
  pitching_stats: {},
  fielding_stats: { putOuts: 2 },
  source_game_pks: [1001],
  calculated_at: '2026-11-13T00:00:00.000Z',
} satisfies MlbPlayerStatRow;

const splitRow = { ...statRow } satisfies PlayerStatSplitRow;
const profile = {
  season: statRow,
  splits: [statRow],
  gameLog: [
    {
      gamePk: 1001,
      date: '2026-04-15',
      teamId: 147,
      teamName: 'Yankees',
      opponent: 'Red Sox',
      isHome: true,
      homeScore: 5,
      awayScore: 3,
      battingStats: { hits: 2 },
      pitchingStats: {},
    },
  ],
} satisfies MlbPlayerProfileStats;

const teamPage = {
  team: { teamId: 147, name: 'Yankees', abbreviation: 'NYY', logoUrl: null },
  season: 2026,
  wins: 1,
  losses: 1,
  ties: 1,
  standing: '2nd in AL East',
  positionPlayers: [
    {
      playerId: 501,
      fullName: 'Aaron Example',
      position: 'RF',
      stats: splitRow,
    },
  ],
  pitchers: [],
  recentGames: [
    {
      gamePk: 1001,
      date: '2026-04-15',
      opponent: 'Red Sox',
      isHome: true,
      teamScore: 5,
      opponentScore: 3,
      result: 'W',
    },
  ],
} satisfies MlbTeamPageData;

const logos = [
  {
    teamId: 147,
    name: 'New York Yankees',
    logoUrl: null,
    leagueId: 103,
    divisionId: 201,
  },
] satisfies MlbTeamLogo[];

const boxScore = {
  teams: [teamStats],
  players: [playerStats],
} satisfies MlbGameBoxScore;

const comment = {
  comment_id: 1,
  author: 'Sam',
  body: 'Great start!',
} satisfies GameComment;

const upcoming = [
  {
    status_abstract: 'Preview',
    official_date: '2026-11-15',
    home_team: { team_name: 'Yankees' },
    away_team: { team_name: 'Red Sox' },
    game_pk: 2001,
  },
] satisfies UpcomingGamePreviews;

const past = [
  {
    game_pk: 1001,
    status_abstract: 'Final',
    official_date: '2026-04-15',
    home_team: { team_name: 'Yankees' },
    away_team: { team_name: 'Red Sox' },
    home_score: 5,
    away_score: 3,
  },
] satisfies PastGamePreviews;

const live = [
  {
    game_pk: 2002,
    status_abstract: 'In Progress',
    official_date: '2026-11-12',
    home_team: { team_name: 'Red Sox' },
    home_score: 2,
    away_team: { team_name: 'Blue Jays' },
    away_score: 1,
    linescore,
  },
] satisfies LiveGamePreviews;

const config = {
  url: 'https://cspn.example.test',
  publishableKey: 'public-key',
} satisfies SupabaseConfig;
const env = {
  VITE_SUPABASE_URL: config.url,
  VITE_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
} satisfies SupabaseEnv;
const clientOptions = {
  url: config.url,
  publishableKey: config.publishableKey,
} satisfies SupabaseClientOptions;
const statsQuery = {
  season: 2026,
  split: 'season',
  playerId: 501,
} satisfies MlbStatsQuery;
const teamRecord = { wins: 1, losses: 1, ties: 1 } satisfies MlbTeamRecord;

export const dataLayerModelExamples = {
  linescore,
  teamStats,
  playerStats,
  game,
  nextGame,
  boxScore,
  player,
  searchResult,
  statRow,
  profile,
  teamPage,
  teamRecord,
  logos,
  comment,
  upcoming,
  past,
  live,
  config,
  env,
  clientOptions,
  statsQuery,
};

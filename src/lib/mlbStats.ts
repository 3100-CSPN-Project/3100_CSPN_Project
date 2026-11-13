import {
  buildPlayerStatSplitRows,
  type PlayerStatSplitRow,
} from '../../scripts/mlb/aggregator.mjs';
import { getSupabaseClient } from './supabase.js';

const PLAYER_GAME_PAGE_SIZE = 1000;
const PLAYER_GAME_SELECT =
  'game_pk, player_id, team_id, batting_stats, pitching_stats, ' +
  'fielding_stats, game:mlb_games!inner(season,official_date,game_type,is_final)';
const PLAYER_PROFILE_GAME_SELECT =
  'game_pk, player_id, team_id, batting_stats, pitching_stats, fielding_stats, ' +
  'game:mlb_games!inner(season,official_date,game_type,is_final,' +
  'home_team_id,away_team_id,home_score,away_score,' +
  'home_team:mlb_teams!home_team_id(team_name),' +
  'away_team:mlb_teams!away_team_id(team_name))';

export const DEFAULT_MLB_STATS_QUERY = Object.freeze({
  gameType: 'R',
  splitType: 'last_games',
  splitValue: '7',
});

export type MlbStatsSplit =
  'season' | 'last7' | 'last14' | { type: 'month'; value: string };

export interface MlbStatsQuery {
  season?: number;
  split?: MlbStatsSplit;
  playerId?: number;
}

export interface MlbPlayerStatRow {
  season: number;
  game_type: 'R';
  player_id: number;
  split_type: 'season' | 'last_games' | 'month';
  split_value: string;
  start_date: string;
  end_date: string;
  games: number;
  at_bats: number | null;
  runs: number | null;
  hits: number | null;
  home_runs: number | null;
  rbi: number | null;
  stolen_bases: number | null;
  batting_average: number | null;
  obp: number | null;
  ops: number | null;
  wins: number | null;
  losses: number | null;
  era: number | null;
  games_started: number | null;
  saves: number | null;
  innings_pitched: string | null;
  strikeouts: number | null;
  whip: number | null;
  team_ids: number[];
  batting_stats: Record<string, unknown>;
  pitching_stats: Record<string, unknown>;
  fielding_stats: Record<string, unknown>;
  source_game_pks: number[];
  calculated_at: string;
}

export interface MlbPlayerGameLogRow {
  gamePk: number;
  date: string;
  teamId: number;
  teamName: string | null;
  opponent: string | null;
  isHome: boolean;
  homeScore: number | null;
  awayScore: number | null;
  battingStats: Record<string, unknown>;
  pitchingStats: Record<string, unknown>;
}

export interface MlbPlayerProfileStats {
  season: MlbPlayerStatRow | null;
  splits: MlbPlayerStatRow[];
  gameLog: MlbPlayerGameLogRow[];
}

interface RawPlayerGameRow {
  game_pk: number;
  team_id: number;
  batting_stats: Record<string, unknown> | null;
  pitching_stats: Record<string, unknown> | null;
  game: {
    official_date: string;
    home_team_id: number | null;
    away_team_id: number | null;
    home_score: number | null;
    away_score: number | null;
    home_team: { team_name: string } | null;
    away_team: { team_name: string } | null;
  };
}

function resolveSplit(split: MlbStatsSplit | undefined) {
  if (!split || split === 'last7') return DEFAULT_MLB_STATS_QUERY;
  if (split === 'season') {
    return { gameType: 'R', splitType: 'season', splitValue: 'season' };
  }
  if (split === 'last14') {
    return { gameType: 'R', splitType: 'last_games', splitValue: '14' };
  }

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(split.value)) {
    throw new Error('Month split must use YYYY-MM format.');
  }

  return { gameType: 'R', splitType: 'month', splitValue: split.value };
}

async function fetchPlayerGameRows(
  season: number,
  playerId?: number,
  includeProfileContext = false,
) {
  const rows: unknown[] = [];

  for (let start = 0; ; start += PLAYER_GAME_PAGE_SIZE) {
    let query = getSupabaseClient()
      .from('mlb_game_player_stats')
      .select(
        includeProfileContext ? PLAYER_PROFILE_GAME_SELECT : PLAYER_GAME_SELECT,
      )
      .eq('game.season', season)
      .eq('game.game_type', 'R')
      .eq('game.is_final', true)
      .order('game_pk', { ascending: true })
      .range(start, start + PLAYER_GAME_PAGE_SIZE - 1);

    if (playerId !== undefined) query = query.eq('player_id', playerId);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Unable to read MLB player game stats: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PLAYER_GAME_PAGE_SIZE) break;
  }

  return rows;
}

function matchesSplit(
  row: PlayerStatSplitRow,
  resolvedSplit: ReturnType<typeof resolveSplit>,
) {
  return (
    row.game_type === resolvedSplit.gameType &&
    row.split_type === resolvedSplit.splitType &&
    row.split_value === resolvedSplit.splitValue
  );
}

/**
 * Reads game-level stats and calculates the requested split without writing
 * aggregate rows back to Supabase.
 */
export async function getMlbPlayerStats({
  season = new Date().getUTCFullYear(),
  split,
  playerId,
}: MlbStatsQuery = {}): Promise<MlbPlayerStatRow[]> {
  const resolvedSplit = resolveSplit(split);
  const sourceRows = await fetchPlayerGameRows(season, playerId);
  const splitRows = buildPlayerStatSplitRows(sourceRows, season);

  return splitRows
    .filter((row) => matchesSplit(row, resolvedSplit))
    .sort(
      (first, second) => first.player_id - second.player_id,
    ) as MlbPlayerStatRow[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numericValue(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads the season summary, supported splits, and dated game rows together. */
export async function getMlbPlayerProfileStats(
  playerId: number,
  season = new Date().getUTCFullYear(),
): Promise<MlbPlayerProfileStats> {
  const sourceRows = (await fetchPlayerGameRows(
    season,
    playerId,
    true,
  )) as RawPlayerGameRow[];
  const splitRows = buildPlayerStatSplitRows(sourceRows, season).filter(
    (row) => row.player_id === playerId,
  ) as MlbPlayerStatRow[];
  const seasonStats =
    splitRows.find((row) => row.split_type === 'season') ?? null;
  const splits = splitRows.sort((first, second) => {
    const splitOrder = (row: MlbPlayerStatRow) => {
      if (row.split_type === 'season') return 0;
      if (row.split_type === 'last_games' && row.split_value === '7') return 1;
      if (row.split_type === 'last_games' && row.split_value === '14') return 2;
      return 3;
    };

    return (
      splitOrder(first) - splitOrder(second) ||
      second.split_value.localeCompare(first.split_value)
    );
  });

  const gameLog = sourceRows
    .map((row) => {
      const game = row.game;
      const isHome = game.home_team_id === row.team_id;
      const team = isHome ? game.home_team : game.away_team;
      const opponent = isHome ? game.away_team : game.home_team;

      return {
        gamePk: Number(row.game_pk),
        date: String(game.official_date).slice(0, 10),
        teamId: Number(row.team_id),
        teamName: team?.team_name ?? null,
        opponent: opponent?.team_name ?? null,
        isHome,
        homeScore: numericValue(game.home_score),
        awayScore: numericValue(game.away_score),
        battingStats: asRecord(row.batting_stats),
        pitchingStats: asRecord(row.pitching_stats),
      };
    })
    .sort(
      (first, second) =>
        second.date.localeCompare(first.date) || second.gamePk - first.gamePk,
    );

  return { season: seasonStats, splits, gameLog };
}

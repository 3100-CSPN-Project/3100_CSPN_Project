import {
  buildPlayerStatSplitRows,
  type PlayerStatSplitRow,
} from '../../scripts/mlb/aggregator.mjs';
import { getSupabaseClient } from './supabase.js';

const PLAYER_GAME_PAGE_SIZE = 1000;
const PLAYER_GAME_SELECT =
  'game_pk, player_id, team_id, batting_stats, pitching_stats, ' +
  'fielding_stats, game:mlb_games!inner(season,official_date,game_type,is_final)';

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

async function fetchPlayerGameRows(season: number, playerId?: number) {
  const rows: unknown[] = [];

  for (let start = 0; ; start += PLAYER_GAME_PAGE_SIZE) {
    let query = getSupabaseClient()
      .from('mlb_game_player_stats')
      .select(PLAYER_GAME_SELECT)
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

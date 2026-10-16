export interface PlayerStatSplitRow {
  season: number;
  game_type: string;
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

export function buildPlayerStatSplitRows(
  records: unknown[],
  season: number,
  now?: string,
  options?: { gameType?: string },
): PlayerStatSplitRow[];

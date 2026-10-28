import { getSupabaseClient } from './supabase.js';

const PLAYER_COLUMNS =
  'player_id, full_name, first_name, last_name, primary_position, ' +
  'bat_side, throw_hand, image_url';

export interface MlbPlayer {
  playerId: number;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  primaryPosition: string | null;
  batSide: string | null;
  throwHand: string | null;
  imageUrl: string | null;
}

export interface MlbPlayerSearchResult extends MlbPlayer {
  rank: number;
}

function mapPlayer(row: Record<string, unknown>): MlbPlayer {
  return {
    playerId: Number(row.player_id),
    fullName: String(row.full_name),
    firstName: (row.first_name as string | null) ?? null,
    lastName: (row.last_name as string | null) ?? null,
    primaryPosition: (row.primary_position as string | null) ?? null,
    batSide: (row.bat_side as string | null) ?? null,
    throwHand: (row.throw_hand as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
  };
}

function asPlayerRecord(row: unknown): Record<string, unknown> {
  return row as Record<string, unknown>;
}

/** Read a player by the same MLB ID used by the player-game stats table. */
export async function getMlbPlayer(
  playerId: number,
): Promise<MlbPlayer | null> {
  const { data, error } = await getSupabaseClient()
    .from('mlb_players')
    .select(PLAYER_COLUMNS)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read MLB player ${playerId}: ${error.message}`);
  }

  return data === null ? null : mapPlayer(asPlayerRecord(data));
}

/** Read an initial directory for the player page before a search is entered. */
export async function getMlbPlayers(limit = 50): Promise<MlbPlayer[]> {
  const { data, error } = await getSupabaseClient()
    .from('mlb_players')
    .select(PLAYER_COLUMNS)
    .order('full_name')
    .limit(limit);

  if (error) {
    throw new Error(`Could not read MLB players: ${error.message}`);
  }

  return ((data as unknown[] | null | undefined) ?? []).map((row) =>
    mapPlayer(asPlayerRecord(row)),
  );
}

/**
 * Search names through the database GIN/inverted index. The returned player ID
 * is then used to fetch that player's aggregate stats.
 */
export async function searchMlbPlayers(
  query: string,
  limit = 20,
): Promise<MlbPlayerSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const { data, error } = await getSupabaseClient().rpc('search_mlb_players', {
    search_query: normalizedQuery,
    result_limit: limit,
  });

  if (error) {
    throw new Error(`Could not search MLB players: ${error.message}`);
  }

  return ((data as unknown[] | null | undefined) ?? []).map((row) => ({
    ...mapPlayer(asPlayerRecord(row)),
    rank: Number(asPlayerRecord(row).rank ?? 0),
  }));
}

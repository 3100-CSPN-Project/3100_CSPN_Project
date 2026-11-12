import { getSupabaseClient } from './supabase';

// one comment row from game_comments
export interface GameComment {
  comment_id: number;
  author: string;
  body: string;
}

// gets every comment on one game, oldest first
export async function getGameComments(gamePk: string): Promise<GameComment[]> {
  const { data, error } = await getSupabaseClient()
    .from('game_comments')
    .select('comment_id, author, body')
    .eq('game_pk', gamePk)
    .order('created_at');

  if (error) throw new Error(error.message);
  return data;
}

// posts one comment, the database checks the lengths
export async function postGameComment(
  gamePk: string,
  author: string,
  body: string,
) {
  const { error } = await getSupabaseClient()
    .from('game_comments')
    .insert({ game_pk: gamePk, author, body });

  if (error) throw new Error(error.message);
}

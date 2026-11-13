import { getSupabaseClient, SupabaseEnv } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient = getSupabaseClient();

export async function getMlbGame(gameId: string) {
  return supabase
    .from('mlb_games')
    .select(
      'game_date, status_abstract, official_date, is_final, venue_name, home_team_id, home_team:mlb_teams!home_team_id(team_name), home_score, away_team_id, away_team:mlb_teams!away_team_id(team_name), away_score, linescore',
    )
    .eq('game_pk', gameId)
    .single()
    .overrideTypes<{
      status_abstract: string;
      official_date: string;
      is_final: boolean;
      venue_name: string;
      home_team: {
        team_name: string;
      };
      home_team_id: string;
      home_score: string;
      away_team: {
        team_name: string;
      };
      away_team_id: string;
      away_score: string;
      linescore: any;
    }>();
}

export type MlbGameData = {
  status_abstract: string;
  official_date: string;
  is_final: boolean;
  venue_name: string;
  home_team: {
    team_name: string;
  };
  home_team_id: string;
  home_score: string;
  away_team: {
    team_name: string;
  };
  away_team_id: string;
  away_score: string;
  linescore: any;
};

export interface MlbNextGame {
  gamePk: number;
  officialDate: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Find the next scheduled game involving a team, if one is on the schedule. */
export async function getMlbNextGameForTeam(
  teamId: number,
  season = new Date().getUTCFullYear(),
): Promise<MlbNextGame | null> {
  const { data, error } = await getSupabaseClient()
    .from('mlb_games')
    .select(
      'game_pk, official_date, home_team:mlb_teams!home_team_id(team_name), away_team:mlb_teams!away_team_id(team_name)',
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('season', season)
    .eq('status_abstract', 'Preview')
    .eq('is_final', false)
    .gte('official_date', localDateKey(new Date()))
    .order('official_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read the next game for team ${teamId}: ${error.message}`);
  }

  if (!data) return null;

  const game = data as unknown as {
    game_pk: number;
    official_date: string;
    home_team: { team_name: string } | null;
    away_team: { team_name: string } | null;
  };

  return {
    gamePk: Number(game.game_pk),
    officialDate: game.official_date,
    homeTeamName: game.home_team?.team_name ?? null,
    awayTeamName: game.away_team?.team_name ?? null,
  };
}

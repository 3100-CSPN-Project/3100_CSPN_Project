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

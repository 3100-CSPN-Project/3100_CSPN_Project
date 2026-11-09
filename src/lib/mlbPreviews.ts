import { getSupabaseClient, SupabaseEnv } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient = getSupabaseClient();

export async function getUpcomingGamePreviews() {
  return supabase
    .from('mlb_games')
    .select(
      'game_pk, status_abstract, official_date, home_team:mlb_teams!home_team_id(team_name), away_team:mlb_teams!away_team_id(team_name)',
    )
    .eq('status_abstract', 'Preview')
    .order('official_date', { ascending: false })
    .limit(3)
    .overrideTypes<
      Array<{
        status_abstract: string;
        official_date: string;
        home_team: {
          team_name: string;
        };
        away_team: {
          team_name: string;
        };
        game_pk: number;
      }>
    >();
}

export async function getPastGamePreviews() {
  return supabase
    .from('mlb_games')
    .select(
      'game_pk, status_abstract, official_date, home_team:mlb_teams!home_team_id(team_name), home_score, away_team:mlb_teams!away_team_id(team_name), away_score',
    )
    .eq('status_abstract', 'Final')
    .order('official_date', { ascending: false })
    .limit(3)
    .overrideTypes<
      Array<{
        game_pk: number;
        status_abstract: string;
        official_date: string;
        home_team: {
          team_name: string;
        };
        away_team: {
          team_name: string;
        };
        home_score: number;
        away_score: number;
      }>
    >();
}

export async function getLiveGamePreviews() {
  return supabase
    .from('mlb_games')
    .select(
      'game_pk, status_abstract, official_date, home_team:mlb_teams!home_team_id(team_name), home_score, away_team:mlb_teams!away_team_id(team_name), away_score, linescore',
    )
    .eq('status_abstract', 'In Progress')
    .order('official_date', { ascending: false })
    .limit(3)
    .overrideTypes<
      Array<{
        game_pk: number;
        status_abstract: string;
        official_date: string;
        home_team: {
          team_name: string;
        };
        home_score: number;
        away_team: {
          team_name: string;
        };
        away_score: number;
        linescore: any;
      }>
    >();
}

export type UpcomingGamePreviews = Array<{
  status_abstract: string;
  official_date: string;
  home_team: {
    team_name: string;
  };
  away_team: {
    team_name: string;
  };
  game_pk: number;
}>;

export type PastGamePreviews = Array<{
  game_pk: number;
  status_abstract: string;
  official_date: string;
  home_team: {
    team_name: string;
  };
  away_team: {
    team_name: string;
  };
  home_score: number;
  away_score: number;
}>;

export type LiveGamePreviews = Array<{
  game_pk: number;
  status_abstract: string;
  official_date: string;
  home_team: {
    team_name: string;
  };
  home_score: number;
  away_team: {
    team_name: string;
  };
  away_score: number;
  linescore: any;
}>;

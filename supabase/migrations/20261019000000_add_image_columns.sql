alter table public.mlb_teams
  add column if not exists logo_url text,
  add column if not exists logo_public_id text;

alter table public.mlb_players
  add column if not exists image_url text,
  add column if not exists image_public_id text;

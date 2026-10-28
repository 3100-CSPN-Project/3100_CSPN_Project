-- Keep player names searchable without duplicating them into the stats table.
-- The player_id foreign key remains the join key for every player-game stat.
alter table public.mlb_players
  add column if not exists search_vector tsvector not null default ''::tsvector;

create or replace function public.refresh_mlb_player_search_vector()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.search_vector := to_tsvector(
    'simple'::regconfig,
    concat_ws(' ', new.full_name, new.first_name, new.last_name, new.player_id)
  );
  return new;
end;
$$;

drop trigger if exists mlb_players_search_vector_trigger on public.mlb_players;
create trigger mlb_players_search_vector_trigger
before insert or update of player_id, full_name, first_name, last_name
on public.mlb_players
for each row
execute function public.refresh_mlb_player_search_vector();

update public.mlb_players
set search_vector = to_tsvector(
  'simple'::regconfig,
  concat_ws(' ', full_name, first_name, last_name, player_id)
)
where search_vector = ''::tsvector;

create index if not exists mlb_players_search_vector_idx
  on public.mlb_players using gin (search_vector);

-- This is the name-to-stats query used by callers that need both pieces of
-- data in one result. Stats are still stored once in mlb_game_player_stats;
-- player_id is the stable join key.
create or replace view public.mlb_player_game_stats_with_names as
select
  p.player_id,
  p.full_name as player_name,
  p.first_name,
  p.last_name,
  p.primary_position,
  p.bat_side,
  p.throw_hand,
  p.image_url,
  s.game_pk,
  s.team_id,
  s.side,
  s.jersey_number,
  s.position_abbreviation,
  s.batting_order,
  s.batting_stats,
  s.pitching_stats,
  s.fielding_stats,
  s.source_json,
  s.updated_at
from public.mlb_players as p
join public.mlb_game_player_stats as s
  on s.player_id = p.player_id;

grant select on public.mlb_player_game_stats_with_names to anon, authenticated;

-- Return ranked player IDs and names for the search UI. The GIN index above
-- backs the search_vector match; stats are fetched by the returned player_id.
create or replace function public.search_mlb_players(
  search_query text,
  result_limit integer default 20
)
returns table (
  player_id bigint,
  full_name text,
  first_name text,
  last_name text,
  primary_position text,
  bat_side text,
  throw_hand text,
  image_url text,
  rank real
)
language sql
stable
set search_path = pg_catalog, public
as $$
  with input as (
    select
      trim(
        regexp_replace(coalesce($1, ''), '[[:space:]]+', ' ', 'g')
      ) as query_text,
      greatest(1, least(coalesce($2, 20), 50)) as max_results
  ),
  tokens as (
    select
      input.query_text,
      input.max_results,
      regexp_replace(raw_token.token, '[^[:alnum:]]', '', 'g') as token
    from input
    cross join lateral regexp_split_to_table(
      input.query_text,
      '[[:space:]]+'
    )
      as raw_token(token)
  ),
  parsed as (
    select
      query_text,
      max_results,
      to_tsquery(
        'simple'::regconfig,
        string_agg(token || ':*', ' & ' order by token)
      ) as ts_query
    from tokens
    where token <> ''
    group by query_text, max_results
  )
  select
    p.player_id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.primary_position,
    p.bat_side,
    p.throw_hand,
    p.image_url,
    ts_rank_cd(p.search_vector, parsed.ts_query) as rank
  from public.mlb_players as p
  cross join parsed
  where parsed.query_text <> ''
    and p.search_vector @@ parsed.ts_query
  order by rank desc, lower(p.full_name), p.player_id
  limit (select max_results from parsed);
$$;

grant execute on function public.search_mlb_players(text, integer)
  to anon, authenticated;

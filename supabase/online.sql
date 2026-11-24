-- Chesscend: online games and the Online Rating.
-- Browsers can only READ their own games; every change goes through the Edge Function
-- "online" (supabase/functions/online), which checks each move with the chess engine.
-- Results and ratings are written by finish_online_game(), never by a browser.

create table if not exists public.online_games (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quick', 'invite')),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'aborted')),
  creator uuid references auth.users on delete set null,
  white uuid references auth.users on delete set null,
  black uuid references auth.users on delete set null,
  white_name text,
  black_name text,
  white_rating int,
  black_rating int,
  base_ms int not null check (base_ms between 60000 and 3600000),
  inc_ms int not null default 0 check (inc_ms between 0 and 60000),
  moves text[] not null default '{}',
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ply int not null default 0,
  white_ms int,
  black_ms int,
  turn_started_at timestamptz,
  draw_offer text check (draw_offer in ('w', 'b')),
  result text check (result in ('1-0', '0-1', '1/2-1/2')),
  reason text,
  white_change int,
  black_change int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists online_games_waiting on public.online_games (kind, base_ms, inc_ms, created_at) where status = 'waiting';
create index if not exists online_games_white on public.online_games (white, created_at desc);
create index if not exists online_games_black on public.online_games (black, created_at desc);
create index if not exists online_games_creator on public.online_games (creator);

create table if not exists public.ratings (
  user_id uuid primary key references auth.users on delete cascade,
  rating int not null default 1200,
  games int not null default 0,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.online_games enable row level security;
alter table public.ratings enable row level security;

drop policy if exists "players read their games" on public.online_games;
create policy "players read their games" on public.online_games
  for select to authenticated
  using ((select auth.uid()) in (creator, white, black));

drop policy if exists "read own rating" on public.ratings;
create policy "read own rating" on public.ratings
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.online_games from anon, authenticated;
revoke all on public.ratings from anon, authenticated;
grant select on public.online_games to authenticated;
grant select on public.ratings to authenticated;

/* ------------------------------------------------------------------ finishing a game
   One transaction: the game is closed only if it is still active at the expected move,
   and both ratings change together (Elo, K = 40 for the first 20 games, then 20).
   A game ended before each side has moved is "aborted" and changes nothing. */
create or replace function public.finish_online_game(
  p_id uuid,
  p_expected_ply int,
  p_moves text[],
  p_fen text,
  p_white_ms int,
  p_black_ms int,
  p_result text,
  p_reason text
) returns public.online_games
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.online_games;
  rw int; rb int; gw int; gb int;
  sw numeric; expw numeric; cw int; cb int;
  rated boolean;
begin
  select * into g from public.online_games
    where id = p_id and status = 'active' and ply = p_expected_ply
    for update;
  if not found then
    return null;
  end if;

  rated := cardinality(p_moves) >= 2 and p_result is not null and g.white is not null and g.black is not null;

  if rated then
    insert into public.ratings (user_id) values (g.white), (g.black) on conflict (user_id) do nothing;
    select rating, games into rw, gw from public.ratings where user_id = g.white for update;
    select rating, games into rb, gb from public.ratings where user_id = g.black for update;
    sw := case p_result when '1-0' then 1 when '0-1' then 0 else 0.5 end;
    expw := 1 / (1 + power(10::numeric, (rb - rw) / 400.0));
    cw := round((case when gw < 20 then 40 else 20 end) * (sw - expw));
    cb := round((case when gb < 20 then 40 else 20 end) * ((1 - sw) - (1 - expw)));
    update public.ratings set
      rating = greatest(100, rating + cw), games = games + 1,
      wins = wins + (sw = 1)::int, draws = draws + (sw = 0.5)::int, losses = losses + (sw = 0)::int,
      updated_at = now()
      where user_id = g.white;
    update public.ratings set
      rating = greatest(100, rating + cb), games = games + 1,
      wins = wins + (sw = 0)::int, draws = draws + (sw = 0.5)::int, losses = losses + (sw = 1)::int,
      updated_at = now()
      where user_id = g.black;
  end if;

  update public.online_games set
    status = case when rated then 'finished' else 'aborted' end,
    moves = p_moves, fen = p_fen, ply = cardinality(p_moves),
    white_ms = p_white_ms, black_ms = p_black_ms,
    result = case when rated then p_result else null end,
    reason = p_reason,
    white_change = case when rated then cw end,
    black_change = case when rated then cb end,
    draw_offer = null, turn_started_at = null,
    finished_at = now(), updated_at = now()
    where id = p_id
    returning * into g;
  return g;
end;
$$;

revoke execute on function public.finish_online_game(uuid, int, text[], text, int, int, text, text) from public, anon, authenticated;
grant execute on function public.finish_online_game(uuid, int, text[], text, int, int, text, text) to service_role;

/* ------------------------------------------------------------------ rankings
   Global: players with at least 5 rated online games. Opponents: players you have met online.
   Only the public username and the Online Rating are returned. */
create or replace function public.online_leaderboard(p_limit int default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select r.user_id, p.username, r.rating, r.games,
           rank() over (order by r.rating desc, r.games desc) as position
    from public.ratings r join public.profiles p on p.id = r.user_id
    where r.games >= 5
  )
  select jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'ranked', (select count(*) from ranked),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('userId', user_id, 'name', username, 'rating', rating, 'games', games, 'position', position) order by position, username)
                      from (select * from ranked order by position, username limit least(greatest(p_limit, 1), 100)) top), '[]'::jsonb),
    'me', (select jsonb_build_object('userId', user_id, 'name', username, 'rating', rating, 'games', games, 'position', position)
           from ranked where user_id = (select auth.uid()))
  );
$$;

create or replace function public.online_opponents()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  opp as (
    select distinct case when g.white = me.id then g.black else g.white end as user_id
    from public.online_games g, me
    where me.id is not null and g.status = 'finished' and me.id in (g.white, g.black)
  ),
  people as (
    select r.user_id, p.username, r.rating, r.games
    from public.ratings r join public.profiles p on p.id = r.user_id
    where r.user_id in (select user_id from opp) or r.user_id = (select id from me)
  )
  select jsonb_build_object(
    'friends', (select count(*) from opp where user_id is not null),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('userId', user_id, 'name', username, 'rating', rating, 'games', games, 'position', position) order by position)
                      from (select *, rank() over (order by rating desc, games desc) as position from people) x), '[]'::jsonb)
  );
$$;

revoke execute on function public.online_leaderboard(int) from public;
revoke execute on function public.online_opponents() from public, anon;
grant execute on function public.online_leaderboard(int) to anon, authenticated;
grant execute on function public.online_opponents() to authenticated;

-- The account deletion also removes the online rating (games keep the names, as results of the other player).

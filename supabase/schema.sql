-- =====================================================================
-- CHESSCEND : comptes joueurs
-- À exécuter UNE fois dans Supabase : SQL Editor > New query > coller > Run.
-- Peut être relancé sans risque (rien n'est effacé).
-- =====================================================================

-- 1. Profils : un pseudo unique par compte -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_.-]{3,20}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

-- 2. Données du joueur : réglages, statistiques, progression ----------
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_data_size check (
    pg_column_size(settings) < 5000 and pg_column_size(stats) < 200000 and pg_column_size(progress) < 20000
  )
);

-- 3. Sécurité : chacun ne voit et ne modifie QUE ses propres données ---
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own data read" on public.user_data;
create policy "own data read" on public.user_data
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own data insert" on public.user_data;
create policy "own data insert" on public.user_data
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "own data update" on public.user_data;
create policy "own data update" on public.user_data
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_data from anon, authenticated;
grant select, update (username) on public.profiles to authenticated;
grant select, insert, update on public.user_data to authenticated;

-- 4. Création automatique du profil avec le compte --------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', 'player_' || substr(new.id::text, 1, 8)));
  insert into public.user_data (user_id) values (new.id);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- 5. Le pseudo est-il libre ? (répond seulement oui / non) -----------
create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select name ~ '^[A-Za-z0-9_.-]{3,20}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;
revoke all on function public.username_available(text) from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- 6. Supprimer son propre compte (droit à l'effacement, RGPD) --------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid(); -- profil et données supprimés avec (on delete cascade)
end;
$$;
revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;

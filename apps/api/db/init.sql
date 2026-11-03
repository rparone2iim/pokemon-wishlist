-- PokéWishlist : schéma de la base PostgreSQL (Supabase).
-- Le script peut être relancé sans risque : il ne recrée que ce qui manque.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/db/init.sql

set client_min_messages = warning;

-- La wishlist : un Pokémon au plus une fois (clé primaire), 6 au maximum (trigger).
create table if not exists public.wishlist (
  pokemon_id integer primary key check (pokemon_id > 0),
  name text not null check (length(trim(name)) > 0),
  -- Surnom choisi par le joueur (12 caractères max, comme dans les jeux)
  nickname text check (nickname is null or length(nickname) between 1 and 12),
  added_at timestamptz not null default now()
);

create index if not exists wishlist_added_at_idx on public.wishlist (added_at);

-- La règle des 6 Pokémon, garantie par la base même si deux ajouts arrivent
-- en même temps : le verrou fait passer les ajouts un par un.
create or replace function public.wishlist_max_6()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.wishlist'));
  -- Un doublon est laissé à la clé primaire (erreur 23505)
  if exists (select 1 from public.wishlist where pokemon_id = new.pokemon_id) then
    return new;
  end if;
  if (select count(*) from public.wishlist) >= 6 then
    raise exception 'La wishlist est pleine (6 max)'
      using errcode = 'check_violation', constraint = 'wishlist_max_6';
  end if;
  return new;
end;
$$;

drop trigger if exists wishlist_max_6 on public.wishlist;
create trigger wishlist_max_6
  before insert on public.wishlist
  for each row execute function public.wishlist_max_6();

-- Supabase expose les tables de « public » via son API REST : sans politique,
-- RLS la ferme. L'API Hono se connecte avec le rôle propriétaire, qui n'est pas concerné.
alter table public.wishlist enable row level security;

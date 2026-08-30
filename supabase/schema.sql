create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  rating integer not null default 1200,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  white_player uuid references public.profiles(id),
  black_player uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active','finished','aborted')),
  rated boolean not null default false,
  initial_seconds integer not null default 600,
  increment_seconds integer not null default 0,
  fen text not null default 'start',
  pgn text not null default '',
  result text,
  winner uuid references public.profiles(id),
  white_time_ms bigint,
  black_time_ms bigint,
  last_move_at timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.game_moves (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  ply integer not null,
  uci text not null,
  san text not null,
  fen_after text not null,
  played_by uuid not null references public.profiles(id),
  client_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(game_id, ply)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references public.profiles(id) on delete cascade,
  opponent uuid references public.profiles(id) on delete cascade,
  rated boolean not null default false,
  initial_seconds integer not null default 600,
  increment_seconds integer not null default 0,
  status text not null default 'open' check (status in ('open','accepted','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, username)
  values(new.id, coalesce(new.raw_user_meta_data->>'username', 'Guest-' || left(new.id::text, 6)))
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_moves enable row level security;
alter table public.challenges enable row level security;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "players read games" on public.games for select to authenticated using (white_player=auth.uid() or black_player=auth.uid());
create policy "players create games" on public.games for insert to authenticated with check (white_player=auth.uid() or black_player=auth.uid());
create policy "players update games" on public.games for update to authenticated using (white_player=auth.uid() or black_player=auth.uid());
create policy "players read moves" on public.game_moves for select to authenticated using (exists(select 1 from public.games g where g.id=game_id and (g.white_player=auth.uid() or g.black_player=auth.uid())));
create policy "players add moves" on public.game_moves for insert to authenticated with check (played_by=auth.uid() and exists(select 1 from public.games g where g.id=game_id and (g.white_player=auth.uid() or g.black_player=auth.uid())));
create policy "challenges readable" on public.challenges for select to authenticated using (status='open' or challenger=auth.uid() or opponent=auth.uid());
create policy "own challenges create" on public.challenges for insert to authenticated with check (challenger=auth.uid());
create policy "challenge participants update" on public.challenges for update to authenticated using (challenger=auth.uid() or opponent=auth.uid() or opponent is null);

-- Supabase PostgreSQL Migration for ChessMaster Pro Multiplayer System
-- Initialize Schema and Row-Level Security (RLS) Policies

-- 1. CREATE public.users TABLE
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  avatar_url text,
  country text default 'US',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. CREATE public.ratings TABLE (Glicko-2 trackings)
create table if not exists public.ratings (
  user_id uuid references public.users(id) on delete cascade not null,
  time_control text not null, -- 'bullet', 'blitz', 'rapid', 'classical', 'puzzle'
  rating integer default 1200 not null,
  rd double precision default 350.0 not null, -- Rating Deviation
  volatility double precision default 0.06 not null, -- Volatility
  games_played integer default 0 not null,
  primary key (user_id, time_control)
);

-- 3. CREATE public.games TABLE
create table if not exists public.games (
  id uuid default gen_random_uuid() not null primary key,
  white_id uuid references public.users(id) on delete set null,
  black_id uuid references public.users(id) on delete set null,
  pgn text,
  result text, -- '1-0' (White wins), '0-1' (Black wins), '1/2-1/2' (Draw), '*' (Ongoing)
  time_control text not null, -- '1+0', '3+2', '10+0', etc.
  rated boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. CREATE public.game_moves TABLE
create table if not exists public.game_moves (
  game_id uuid references public.games(id) on delete cascade not null,
  move_number integer not null,
  san text not null, -- e.g., 'e4', 'Nf3'
  fen text not null, -- FEN string after this move
  clock_white integer, -- White clock remaining in seconds
  clock_black integer, -- Black clock remaining in seconds
  primary key (game_id, move_number)
);

-- 5. CREATE public.friends TABLE
create table if not exists public.friends (
  user_id uuid references public.users(id) on delete cascade not null,
  friend_id uuid references public.users(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'blocked')) not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (user_id, friend_id)
);

-- 6. INDEXES FOR PERFORMANCE
create index if not exists users_username_idx on public.users (username);
create index if not exists ratings_user_id_idx on public.ratings (user_id);
create index if not exists games_white_id_idx on public.games (white_id);
create index if not exists games_black_id_idx on public.games (black_id);
create index if not exists game_moves_game_id_idx on public.game_moves (game_id);

-- 7. ENABLE ROW-LEVEL SECURITY (RLS)
alter table public.users enable row level security;
alter table public.ratings enable row level security;
alter table public.games enable row level security;
alter table public.game_moves enable row level security;
alter table public.friends enable row level security;

-- 8. RLS POLICIES

-- Profiles: Viewable by anyone, writeable by own user id
create policy "Public profiles are viewable by everyone"
  on public.users for select using (true);

create policy "Users can insert their own profile"
  on public.users for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update using (auth.uid() = id);

-- Ratings: Viewable by anyone, writeable by admin or server (server will use service-role key, bypassing RLS)
create policy "Ratings are viewable by everyone"
  on public.ratings for select using (true);

-- Games: Viewable by everyone
create policy "Games are viewable by everyone"
  on public.games for select using (true);

-- Game Moves: Viewable by everyone
create policy "Game moves are viewable by everyone"
  on public.game_moves for select using (true);

-- Friends: Only players involved can read or modify friend links
create policy "Users can read their own friendships"
  on public.friends for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can manage friendships"
  on public.friends for all using (auth.uid() = user_id or auth.uid() = friend_id);

-- 9. AUTOMATED SIGNUP SYNCHRONIZATION TRIGGER
-- Automatically copies users from auth.users to public.users on signup, initializing Glicko-2 rating baselines

create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_username text;
begin
  default_username := coalesce(
    new.raw_user_meta_data->>'username',
    'player_' || substr(md5(random()::text), 1, 8)
  );

  insert into public.users (id, username, avatar_url, country)
  values (
    new.id,
    default_username,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'country', 'US')
  );

  -- Insert default Glicko-2 rating records for all 5 time controls
  insert into public.ratings (user_id, time_control, rating, rd, volatility, games_played)
  values 
    (new.id, 'bullet', 1200, 350.0, 0.06, 0),
    (new.id, 'blitz', 1200, 350.0, 0.06, 0),
    (new.id, 'rapid', 1200, 350.0, 0.06, 0),
    (new.id, 'classical', 1200, 350.0, 0.06, 0),
    (new.id, 'puzzle', 1200, 350.0, 0.06, 0);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

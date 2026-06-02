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

  -- Insert default puzzles system rating record
  insert into public.puzzle_ratings (user_id, rating, rd)
  values (new.id, 1200, 350.0);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 10. CREATE public.puzzles TABLE
create table if not exists public.puzzles (
  id text not null primary key,
  fen text not null,
  moves text[] not null, -- Array of coordinate moves, e.g. 'e2e4'
  rating integer not null,
  themes text[] not null,
  popularity integer default 100 not null
);

-- 11. CREATE public.puzzle_attempts TABLE
create table if not exists public.puzzle_attempts (
  user_id uuid references public.users(id) on delete cascade not null,
  puzzle_id text references public.puzzles(id) on delete cascade not null,
  solved boolean not null,
  time_taken integer, -- time in seconds
  attempted_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (user_id, puzzle_id, attempted_at)
);

-- 12. CREATE public.puzzle_ratings TABLE
create table if not exists public.puzzle_ratings (
  user_id uuid references public.users(id) on delete cascade not null primary key,
  rating integer default 1200 not null,
  rd double precision default 350.0 not null
);

-- 13. CREATE public.daily_puzzles TABLE
create table if not exists public.daily_puzzles (
  date date not null primary key default current_date,
  puzzle_id text references public.puzzles(id) on delete cascade not null
);

-- 14. INDEXES FOR PUZZLES PERFORMANCE
create index if not exists puzzles_rating_idx on public.puzzles (rating);
create index if not exists puzzle_attempts_user_id_idx on public.puzzle_attempts (user_id);

-- 15. ENABLE ROW-LEVEL SECURITY (RLS) FOR PUZZLE TABLES
alter table public.puzzles enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.puzzle_ratings enable row level security;
alter table public.daily_puzzles enable row level security;

-- 16. RLS POLICIES FOR PUZZLES
create policy "Puzzles are viewable by everyone" on public.puzzles for select using (true);
create policy "Daily puzzles are viewable by everyone" on public.daily_puzzles for select using (true);
create policy "Puzzle attempts are viewable by everyone" on public.puzzle_attempts for select using (true);
create policy "Users can log own attempts" on public.puzzle_attempts for insert with check (auth.uid() = user_id);
create policy "Puzzle ratings are viewable by everyone" on public.puzzle_ratings for select using (true);
create policy "Users can update own puzzle rating" on public.puzzle_ratings for update using (auth.uid() = user_id);
create policy "Users can insert own puzzle rating" on public.puzzle_ratings for insert with check (auth.uid() = user_id);


-- 17. MONETIZATION UPGRADES SCHEMA (Subscriptions, Shop, Tournaments)

-- Upgrade public.users with Stripe/Subscription columns
alter table public.users add column if not exists subscription_tier text default 'free' check (subscription_tier in ('free', 'silver', 'gold', 'diamond'));
alter table public.users add column if not exists stripe_customer_id text;
alter table public.users add column if not exists subscription_id text;
alter table public.users add column if not exists current_period_end timestamptz;

-- Create public.shop_items Table
create table if not exists public.shop_items (
  id uuid default gen_random_uuid() not null primary key,
  name text not null,
  type text check (type in ('board_theme', 'piece_set', 'move_sound', 'profile_border', 'avatar_frame')) not null,
  price_inr integer not null,
  preview_url text,
  data jsonb default '{}'::jsonb not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create public.user_items Table (Purchased assets)
create table if not exists public.user_items (
  user_id uuid references public.users(id) on delete cascade not null,
  item_id uuid references public.shop_items(id) on delete cascade not null,
  purchased_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (user_id, item_id)
);

-- Create public.tournaments Table
create table if not exists public.tournaments (
  id uuid default gen_random_uuid() not null primary key,
  name text not null,
  type text check (type in ('free', 'silver_gate', 'paid')) not null,
  entry_fee_inr integer default 0 not null,
  prize_pool_inr integer default 0 not null,
  status text check (status in ('upcoming', 'live', 'finished')) default 'upcoming' not null,
  start_time timestamptz not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create public.tournament_participants Table
create table if not exists public.tournament_participants (
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  registered_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (tournament_id, user_id)
);

-- Indexes for performance
create index if not exists shop_items_type_idx on public.shop_items(type);
create index if not exists user_items_user_id_idx on public.user_items(user_id);
create index if not exists tournament_participants_tid_idx on public.tournament_participants(tournament_id);

-- Enable RLS
alter table public.shop_items enable row level security;
alter table public.user_items enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;

-- Policies for Shop Items (public read, only service-role writes)
create policy "Shop items are viewable by everyone" on public.shop_items for select using (true);

-- Policies for User Items (purchased customisations)
create policy "User items are viewable by everyone" on public.user_items for select using (true);
create policy "Users can log their own purchases" on public.user_items for insert with check (auth.uid() = user_id);

-- Policies for Tournaments
create policy "Tournaments are viewable by everyone" on public.tournaments for select using (true);

-- Policies for Tournament Participants
create policy "Tournament participants viewable by everyone" on public.tournament_participants for select using (true);
create policy "Users can register themselves for tournaments" on public.tournament_participants for insert with check (auth.uid() = user_id);



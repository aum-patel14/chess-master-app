-- Supabase migration for Lichess puzzles trainer

CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,                  -- Lichess puzzle ID e.g. "00008"
  fen TEXT NOT NULL,                    -- Position FEN before the puzzle starts
  moves TEXT NOT NULL,                  -- Space-separated UCI moves e.g. "e2e4 d7d5"
  rating INTEGER NOT NULL,              -- Puzzle difficulty rating (Lichess Elo)
  rating_deviation INTEGER,
  popularity INTEGER,
  nb_plays INTEGER,
  themes TEXT[],                        -- e.g. {"fork","mateIn2","middlegame"}
  game_url TEXT,
  opening_tags TEXT
);

CREATE TABLE IF NOT EXISTS puzzle_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_id TEXT REFERENCES puzzles(id),
  solved BOOLEAN NOT NULL,
  time_taken_ms INTEGER,
  mode TEXT NOT NULL,                   -- 'rated' | 'streak' | 'daily'
  rating_before INTEGER,
  rating_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS puzzle_ratings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 1200,
  rating_deviation INTEGER NOT NULL DEFAULT 350,
  volatility NUMERIC NOT NULL DEFAULT 0.06,
  games_played INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  daily_last_solved DATE,
  daily_streak_days INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS puzzles_rating_idx ON puzzles(rating);
CREATE INDEX IF NOT EXISTS puzzles_themes_idx ON puzzles USING gin (themes);
CREATE INDEX IF NOT EXISTS puzzle_activity_user_mode_created_idx ON puzzle_activity(user_id, mode, created_at DESC);

-- Enable RLS
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzle_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzle_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to puzzles" ON puzzles FOR SELECT USING (true);

CREATE POLICY "Allow users to read their own puzzle activity" ON puzzle_activity FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own puzzle activity" ON puzzle_activity FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to read their own puzzle ratings" ON puzzle_ratings FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Allow users to manage their own puzzle ratings" ON puzzle_ratings FOR ALL 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Glicko-2 initialization trigger on user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_puzzle_rating()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.puzzle_ratings (user_id, rating, rating_deviation, volatility)
  VALUES (new.id, 1200, 350, 0.06)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for rating-based random puzzle selection
CREATE OR REPLACE FUNCTION get_puzzle_for_rating(target_rating INT, exclude_ids TEXT[])
RETURNS SETOF puzzles AS $$
  SELECT * FROM puzzles
  WHERE rating BETWEEN target_rating - 100 AND target_rating + 100
    AND id != ALL(exclude_ids)
  ORDER BY random()
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- SQL Migration for Supabase Realtime Chess Multiplayer

-- 1. Create Enums if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
    CREATE TYPE game_status AS ENUM ('waiting', 'active', 'completed', 'abandoned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_result') THEN
    CREATE TYPE game_result AS ENUM ('white_wins', 'black_wins', 'draw', 'abandoned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_control') THEN
    CREATE TYPE time_control AS ENUM (
      'bullet_1_0', 'bullet_1_1', 'bullet_2_1', 
      'blitz_3_0', 'blitz_3_2', 'blitz_5_0', 'blitz_5_3', 
      'rapid_10_0', 'rapid_10_5', 'rapid_15_10', 'classical_30_0'
    );
  END IF;
END$$;

-- 2. Create online_games table
CREATE TABLE IF NOT EXISTS public.online_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  white_id UUID REFERENCES auth.users(id),
  black_id UUID REFERENCES auth.users(id),
  white_username TEXT,
  black_username TEXT,
  white_elo INTEGER,
  black_elo INTEGER,
  time_control time_control NOT NULL,
  is_rated BOOLEAN DEFAULT true,
  status game_status DEFAULT 'waiting',
  result game_result,
  pgn TEXT,
  fen_history TEXT[],
  current_fen TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  white_time_ms INTEGER,
  black_time_ms INTEGER,
  last_move_at TIMESTAMPTZ,
  draw_offered_by UUID,
  takeback_requested_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 3. Create matchmaking_queue table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL,
  elo INTEGER NOT NULL,
  time_control time_control NOT NULL,
  is_rated BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Performance Indexes
CREATE INDEX IF NOT EXISTS online_games_status_time_control_idx ON public.online_games(status, time_control);
CREATE INDEX IF NOT EXISTS online_games_white_id_created_idx ON public.online_games(white_id, created_at DESC);
CREATE INDEX IF NOT EXISTS online_games_black_id_created_idx ON public.online_games(black_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matchmaking_queue_tc_elo_joined_idx ON public.matchmaking_queue(time_control, elo, joined_at);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.online_games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist before creating
DROP POLICY IF EXISTS "Players can view their games" ON public.online_games;
DROP POLICY IF EXISTS "Players can update their games" ON public.online_games;

CREATE POLICY "Players can view their games" ON public.online_games FOR SELECT 
  USING (auth.uid() = white_id OR auth.uid() = black_id OR status = 'waiting');

CREATE POLICY "Players can update their games" ON public.online_games FOR UPDATE 
  USING (auth.uid() = white_id OR auth.uid() = black_id);

-- 6. Room Code Generator Helper
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * 36 + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. PL/pgSQL Atomic Matchmaking Function
CREATE OR REPLACE FUNCTION public.join_matchmaking(
  p_user_id UUID,
  p_username TEXT,
  p_elo INTEGER,
  p_time_control time_control,
  p_is_rated BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  match_rec RECORD;
  new_game_rec RECORD;
  room_candidate TEXT;
  white_player_id UUID;
  black_player_id UUID;
  white_player_username TEXT;
  black_player_username TEXT;
  white_player_elo INTEGER;
  black_player_elo INTEGER;
  initial_time_ms INTEGER;
BEGIN
  -- Determine time control initial remaining time in milliseconds
  IF p_time_control = 'bullet_1_0' THEN initial_time_ms := 60000;
  ELSIF p_time_control = 'bullet_1_1' THEN initial_time_ms := 60000;
  ELSIF p_time_control = 'bullet_2_1' THEN initial_time_ms := 120000;
  ELSIF p_time_control = 'blitz_3_0' THEN initial_time_ms := 180000;
  ELSIF p_time_control = 'blitz_3_2' THEN initial_time_ms := 180000;
  ELSIF p_time_control = 'blitz_5_0' THEN initial_time_ms := 300000;
  ELSIF p_time_control = 'blitz_5_3' THEN initial_time_ms := 300000;
  ELSIF p_time_control = 'rapid_10_0' THEN initial_time_ms := 600000;
  ELSIF p_time_control = 'rapid_10_5' THEN initial_time_ms := 600000;
  ELSIF p_time_control = 'rapid_15_10' THEN initial_time_ms := 900000;
  ELSIF p_time_control = 'classical_30_0' THEN initial_time_ms := 1800000;
  ELSE initial_time_ms := 180000;
  END IF;

  -- 1. Look for a compatible opponent in the queue
  SELECT * INTO match_rec 
  FROM public.matchmaking_queue
  WHERE time_control = p_time_control
    AND is_rated = p_is_rated
    AND user_id != p_user_id
    AND elo BETWEEN p_elo - 200 AND p_elo + 200
  ORDER BY joined_at ASC
  LIMIT 1;

  IF FOUND THEN
    -- Match found!
    -- Remove the opponent from the queue
    DELETE FROM public.matchmaking_queue WHERE user_id = match_rec.user_id;
    -- Remove self from the queue just in case we were in it
    DELETE FROM public.matchmaking_queue WHERE user_id = p_user_id;

    -- Randomly assign colors (White vs Black)
    IF random() < 0.5 THEN
      white_player_id := p_user_id;
      white_player_username := p_username;
      white_player_elo := p_elo;
      black_player_id := match_rec.user_id;
      black_player_username := match_rec.username;
      black_player_elo := match_rec.elo;
    ELSE
      white_player_id := match_rec.user_id;
      white_player_username := match_rec.username;
      white_player_elo := match_rec.elo;
      black_player_id := p_user_id;
      black_player_username := p_username;
      black_player_elo := p_elo;
    END IF;

    -- Generate a unique 6-char room code
    LOOP
      room_candidate := public.generate_room_code();
      -- Verify uniqueness among active/waiting games
      IF NOT EXISTS (SELECT 1 FROM public.online_games WHERE room_code = room_candidate AND status IN ('waiting', 'active')) THEN
        EXIT;
      END IF;
    END LOOP;

    -- Create game room
    INSERT INTO public.online_games (
      room_code,
      white_id,
      black_id,
      white_username,
      black_username,
      white_elo,
      black_elo,
      time_control,
      is_rated,
      status,
      white_time_ms,
      black_time_ms,
      last_move_at,
      current_fen,
      fen_history
    ) VALUES (
      room_candidate,
      white_player_id,
      black_player_id,
      white_player_username,
      black_player_username,
      white_player_elo,
      black_player_elo,
      p_time_control,
      p_is_rated,
      'active',
      initial_time_ms,
      initial_time_ms,
      now(),
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      ARRAY['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']
    ) RETURNING * INTO new_game_rec;

    -- Return JSON payload of the matched game room
    RETURN json_build_object(
      'matched', true,
      'game', row_to_json(new_game_rec)
    );
  ELSE
    -- No match found. Add (or update) self in the matchmaking queue
    INSERT INTO public.matchmaking_queue (
      user_id,
      username,
      elo,
      time_control,
      is_rated,
      joined_at
    ) VALUES (
      p_user_id,
      p_username,
      p_elo,
      p_time_control,
      p_is_rated,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      time_control = EXCLUDED.time_control,
      is_rated = EXCLUDED.is_rated,
      joined_at = now();

    RETURN json_build_object(
      'matched', false,
      'game', null
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. PL/pgSQL Join Private Lobby Function
CREATE OR REPLACE FUNCTION public.join_private_game(
  p_room_code TEXT,
  p_user_id UUID,
  p_username TEXT,
  p_elo INTEGER
)
RETURNS JSON AS $$
DECLARE
  game_rec RECORD;
  initial_time_ms INTEGER;
BEGIN
  -- Find the game
  SELECT * INTO game_rec 
  FROM public.online_games 
  WHERE room_code = p_room_code AND status = 'waiting'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Room not found or game already started.');
  END IF;

  -- Ensure we are not joining our own game
  IF game_rec.white_id = p_user_id OR game_rec.black_id = p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'You cannot join your own private lobby.');
  END IF;

  -- Determine initial time control remaining time
  IF game_rec.time_control = 'bullet_1_0' THEN initial_time_ms := 60000;
  ELSIF game_rec.time_control = 'bullet_1_1' THEN initial_time_ms := 60000;
  ELSIF game_rec.time_control = 'bullet_2_1' THEN initial_time_ms := 120000;
  ELSIF game_rec.time_control = 'blitz_3_0' THEN initial_time_ms := 180000;
  ELSIF game_rec.time_control = 'blitz_3_2' THEN initial_time_ms := 180000;
  ELSIF game_rec.time_control = 'blitz_5_0' THEN initial_time_ms := 300000;
  ELSIF game_rec.time_control = 'blitz_5_3' THEN initial_time_ms := 300000;
  ELSIF game_rec.time_control = 'rapid_10_0' THEN initial_time_ms := 600000;
  ELSIF game_rec.time_control = 'rapid_10_5' THEN initial_time_ms := 600000;
  ELSIF game_rec.time_control = 'rapid_15_10' THEN initial_time_ms := 900000;
  ELSIF game_rec.time_control = 'classical_30_0' THEN initial_time_ms := 1800000;
  ELSE initial_time_ms := 180000;
  END IF;

  -- Assign the second player (black)
  UPDATE public.online_games
  SET 
    black_id = p_user_id,
    black_username = p_username,
    black_elo = p_elo,
    status = 'active',
    white_time_ms = initial_time_ms,
    black_time_ms = initial_time_ms,
    last_move_at = now()
  WHERE id = game_rec.id
  RETURNING * INTO game_rec;

  RETURN json_build_object(
    'success', true,
    'game', row_to_json(game_rec)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. PL/pgSQL Create Match Function
CREATE OR REPLACE FUNCTION public.create_match(
  p1 UUID,
  p2 UUID,
  tc time_control,
  rated BOOLEAN
)
RETURNS TEXT AS $$
DECLARE
  code TEXT := upper(substring(md5(random()::text), 1, 6));
  white_user UUID;
  black_user UUID;
  white_user_username TEXT;
  black_user_username TEXT;
  white_user_elo INTEGER;
  black_user_elo INTEGER;
  initial_time_ms INTEGER;
BEGIN
  -- Determine player colors randomly
  IF random() > 0.5 THEN
    white_user := p1;
    black_user := p2;
  ELSE
    white_user := p2;
    black_user := p1;
  END IF;

  -- Fetch usernames and Elo ratings
  -- Since we have columns in online_games for usernames and Elos, let's fetch them from profiles or queue if possible
  -- Or default them (users can update them upon joining or we look them up)
  -- Wait! In chessmaster, there is a profiles table or auth.users?
  -- In chessmaster, profiles table exists. Let's fetch them from auth.users or profiles if possible
  -- Let's fetch from public.puzzle_ratings (which has user_id) or public.profiles.
  -- Wait, let's see if there is public.profiles or how profile stats are fetched.
  -- Actually, we can fetch from profiles or auth.users or just set them to default/lookup.
  -- Wait, let's see where profiles are stored. Let's do a search for SELECT * FROM in our codebase.
  -- Wait, in join_matchmaking we passed p_username and p_elo. But here we delete from queue.
  -- We can fetch the username and elo from matchmaking_queue before deleting them!
  -- This is extremely clean and avoids querying another table!
  SELECT username, elo INTO white_user_username, white_user_elo FROM public.matchmaking_queue WHERE user_id = white_user;
  SELECT username, elo INTO black_user_username, black_user_elo FROM public.matchmaking_queue WHERE user_id = black_user;

  -- Fallbacks if not found in queue
  IF white_user_username IS NULL THEN
    white_user_username := 'Player 1';
    white_user_elo := 1200;
  END IF;
  IF black_user_username IS NULL THEN
    black_user_username := 'Player 2';
    black_user_elo := 1200;
  END IF;

  -- Determine initial time control remaining time in milliseconds
  IF tc = 'bullet_1_0' THEN initial_time_ms := 60000;
  ELSIF tc = 'bullet_1_1' THEN initial_time_ms := 60000;
  ELSIF tc = 'bullet_2_1' THEN initial_time_ms := 120000;
  ELSIF tc = 'blitz_3_0' THEN initial_time_ms := 180000;
  ELSIF tc = 'blitz_3_2' THEN initial_time_ms := 180000;
  ELSIF tc = 'blitz_5_0' THEN initial_time_ms := 300000;
  ELSIF tc = 'blitz_5_3' THEN initial_time_ms := 300000;
  ELSIF tc = 'rapid_10_0' THEN initial_time_ms := 600000;
  ELSIF tc = 'rapid_10_5' THEN initial_time_ms := 600000;
  ELSIF tc = 'rapid_15_10' THEN initial_time_ms := 900000;
  ELSIF tc = 'classical_30_0' THEN initial_time_ms := 1800000;
  ELSE initial_time_ms := 180000;
  END IF;

  -- Create game room
  INSERT INTO public.online_games (
    room_code,
    white_id,
    black_id,
    white_username,
    black_username,
    white_elo,
    black_elo,
    time_control,
    is_rated,
    status,
    white_time_ms,
    black_time_ms,
    last_move_at,
    current_fen,
    fen_history
  ) VALUES (
    code,
    white_user,
    black_user,
    white_user_username,
    black_user_username,
    white_user_elo,
    black_user_elo,
    tc,
    rated,
    'active',
    initial_time_ms,
    initial_time_ms,
    now(),
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ARRAY['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']
  );

  -- Remove players from queue
  DELETE FROM public.matchmaking_queue WHERE user_id IN (p1, p2);
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Enable Supabase Realtime Replication for Online Games and Matchmaking Queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON c.oid = pr.prrelid 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'online_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.online_games;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON c.oid = pr.prrelid 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'matchmaking_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
  END IF;
END$$;

-- 11. Support ratings Elo fields & atomic online match completion
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS elo INTEGER;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS peak_elo INTEGER;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS draws INTEGER DEFAULT 0;

-- Sync ratings data
UPDATE public.ratings SET elo = rating WHERE elo IS NULL;
UPDATE public.ratings SET peak_elo = rating WHERE peak_elo IS NULL;

CREATE OR REPLACE FUNCTION public.complete_online_game(
  game_id UUID, game_result game_result, final_pgn TEXT
) RETURNS void AS $$
DECLARE
  g online_games%ROWTYPE;
  white_score NUMERIC; black_score NUMERIC;
  white_new_elo INTEGER; black_new_elo INTEGER;
  k INTEGER := 32;
  white_expected NUMERIC; black_expected NUMERIC;
  tc_text TEXT;
BEGIN
  SELECT * INTO g FROM online_games WHERE id = game_id;

  IF g.status IS NULL OR g.status != 'active' THEN
    RETURN;
  END IF;

  UPDATE online_games SET status = 'completed', result = game_result,
    pgn = final_pgn, completed_at = now() 
  WHERE id = game_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT g.is_rated THEN RETURN; END IF;

  white_score := CASE game_result WHEN 'white_wins' THEN 1 WHEN 'black_wins' THEN 0 ELSE 0.5 END;
  black_score := 1 - white_score;

  white_expected := 1.0 / (1 + power(10, (g.black_elo - g.white_elo)::NUMERIC / 400));
  black_expected := 1.0 - white_expected;

  white_new_elo := GREATEST(100, g.white_elo + round(k * (white_score - white_expected)));
  black_new_elo := GREATEST(100, g.black_elo + round(k * (black_score - black_expected)));

  tc_text := CASE 
    WHEN g.time_control::TEXT LIKE 'bullet%' THEN 'bullet'
    WHEN g.time_control::TEXT LIKE 'blitz%' THEN 'blitz'
    WHEN g.time_control::TEXT LIKE 'rapid%' THEN 'rapid'
    WHEN g.time_control::TEXT LIKE 'classical%' THEN 'classical'
    ELSE 'blitz'
  END;

  UPDATE ratings SET
    elo = white_new_elo,
    rating = white_new_elo,
    peak_elo = GREATEST(COALESCE(peak_elo, 1200), white_new_elo),
    games_played = games_played + 1,
    wins = wins + (CASE game_result WHEN 'white_wins' THEN 1 ELSE 0 END),
    draws = draws + (CASE game_result WHEN 'draw' THEN 1 ELSE 0 END),
    losses = losses + (CASE game_result WHEN 'black_wins' THEN 1 ELSE 0 END)
  WHERE user_id = g.white_id AND time_control = tc_text;

  UPDATE ratings SET
    elo = black_new_elo,
    rating = black_new_elo,
    peak_elo = GREATEST(COALESCE(peak_elo, 1200), black_new_elo),
    games_played = games_played + 1,
    wins = wins + (CASE game_result WHEN 'black_wins' THEN 1 ELSE 0 END),
    draws = draws + (CASE game_result WHEN 'draw' THEN 1 ELSE 0 END),
    losses = losses + (CASE game_result WHEN 'white_wins' THEN 1 ELSE 0 END)
  WHERE user_id = g.black_id AND time_control = tc_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




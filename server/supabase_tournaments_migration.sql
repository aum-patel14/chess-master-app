-- Supabase migration for ChessMaster Pro Tournament System

-- 1. Create Types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_format') THEN
    CREATE TYPE tournament_format AS ENUM ('arena', 'swiss');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_status') THEN
    CREATE TYPE tournament_status AS ENUM ('upcoming', 'registration', 'active', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prize_type') THEN
    CREATE TYPE prize_type AS ENUM ('badge', 'trophy', 'title', 'none');
  END IF;
END$$;

-- 2. Add badges column to public.users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- 3. Create Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  format tournament_format NOT NULL,
  status tournament_status DEFAULT 'upcoming',
  time_control TEXT NOT NULL,
  is_rated BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  is_admin_created BOOLEAN DEFAULT false,
  max_players INTEGER DEFAULT 64,
  min_players INTEGER DEFAULT 4,
  registration_opens_at TIMESTAMPTZ NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  total_rounds INTEGER,
  current_round INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  prize_type prize_type DEFAULT 'none',
  prize_badge_name TEXT,
  prize_badge_emoji TEXT,
  prize_trophy_tier TEXT,
  min_elo INTEGER,
  max_elo INTEGER,
  player_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Tournament Players Table
CREATE TABLE IF NOT EXISTS public.tournament_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  elo_at_entry INTEGER NOT NULL,
  score NUMERIC DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  consecutive_wins INTEGER DEFAULT 0,
  rank INTEGER,
  prize_awarded TEXT,
  withdrawn BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- 5. Create Tournament Pairings Table
CREATE TABLE IF NOT EXISTS public.tournament_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  white_id UUID REFERENCES auth.users(id),
  black_id UUID REFERENCES auth.users(id),
  game_id UUID REFERENCES public.online_games(id) ON DELETE SET NULL,
  result TEXT, -- 'white' | 'black' | 'draw' | 'pending' | 'bye'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Tournament Prizes Table
CREATE TABLE IF NOT EXISTS public.tournament_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  prize_type prize_type NOT NULL,
  badge_name TEXT,
  badge_emoji TEXT,
  trophy_tier TEXT,
  awarded_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Indexes
CREATE INDEX IF NOT EXISTS tournaments_status_starts_at_idx ON public.tournaments(status, starts_at);
CREATE INDEX IF NOT EXISTS tournament_players_t_id_score_idx ON public.tournament_players(tournament_id, score DESC);
CREATE INDEX IF NOT EXISTS tournament_pairings_t_id_round_idx ON public.tournament_pairings(tournament_id, round);

-- 8. Create Auto-update player count trigger
CREATE OR REPLACE FUNCTION update_player_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.tournaments SET player_count = (
      SELECT COUNT(*) FROM public.tournament_players WHERE tournament_id = OLD.tournament_id AND NOT withdrawn
    ) WHERE id = OLD.tournament_id;
    RETURN OLD;
  ELSE
    UPDATE public.tournaments SET player_count = (
      SELECT COUNT(*) FROM public.tournament_players WHERE tournament_id = NEW.tournament_id AND NOT withdrawn
    ) WHERE id = NEW.tournament_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_count_trigger ON public.tournament_players;
CREATE TRIGGER player_count_trigger 
  AFTER INSERT OR UPDATE OR DELETE ON public.tournament_players 
  FOR EACH ROW EXECUTE FUNCTION update_player_count();

-- 9. Enable Row-Level Security
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_prizes ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Tournaments: public read, write access for authenticated users
CREATE POLICY "Allow public read of tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Allow users to create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow creators to update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Tournament Players: public read, join/withdrawal for self
CREATE POLICY "Allow public read of players" ON public.tournament_players FOR SELECT USING (true);
CREATE POLICY "Allow users to register/withdraw" ON public.tournament_players FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tournament Pairings: public read, write for admin/creators/players in tournament
CREATE POLICY "Allow public read of pairings" ON public.tournament_pairings FOR SELECT USING (true);
CREATE POLICY "Allow users to update pairings" ON public.tournament_pairings FOR ALL USING (auth.uid() IS NOT NULL);

-- Tournament Prizes: public read
CREATE POLICY "Allow public read of prizes" ON public.tournament_prizes FOR SELECT USING (true);

-- 11. RPC: complete_tournament (Declaring early since it is called by submit_result)
CREATE OR REPLACE FUNCTION complete_tournament(t_id UUID)
RETURNS void AS $$
DECLARE 
  t public.tournaments%ROWTYPE; 
  top3_ids UUID[];
BEGIN
  SELECT * INTO t FROM public.tournaments WHERE id = t_id;
  UPDATE public.tournaments SET status = 'completed' WHERE id = t_id;

  SELECT array_agg(user_id) INTO top3_ids
  FROM (
    SELECT user_id FROM public.tournament_players
    WHERE tournament_id = t_id AND NOT withdrawn
    ORDER BY score DESC, wins DESC
    LIMIT 3
  ) sub;

  IF top3_ids IS NOT NULL THEN
    FOR i IN 1..LEAST(array_length(top3_ids, 1), 3) LOOP
      IF t.prize_type = 'badge' THEN
        INSERT INTO public.tournament_prizes (tournament_id, user_id, rank, prize_type, badge_name, badge_emoji)
        VALUES (t_id, top3_ids[i], i, 'badge', t.prize_badge_name, t.prize_badge_emoji);
        
        UPDATE public.users 
        SET badges = array_append(COALESCE(badges, '{}'), t.prize_badge_emoji || ' ' || t.prize_badge_name) 
        WHERE id = top3_ids[i];
      ELSIF t.prize_type = 'trophy' THEN
        INSERT INTO public.tournament_prizes (tournament_id, user_id, rank, prize_type, trophy_tier)
        VALUES (t_id, top3_ids[i], i, 'trophy', CASE i WHEN 1 THEN 'gold' WHEN 2 THEN 'silver' ELSE 'bronze' END);
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: generate_swiss_round (Declaring early)
CREATE OR REPLACE FUNCTION generate_swiss_round(t_id UUID)
RETURNS void AS $$
DECLARE
  t public.tournaments%ROWTYPE;
  players UUID[];
  i INTEGER; j INTEGER;
  paired UUID[];
  white_player UUID; black_player UUID;
BEGIN
  -- Fetch and update round counter
  UPDATE public.tournaments SET current_round = current_round + 1 WHERE id = t_id RETURNING * INTO t;

  -- Get active players ordered by score
  SELECT array_agg(user_id ORDER BY score DESC, wins DESC)
  INTO players FROM public.tournament_players
  WHERE tournament_id = t_id AND NOT withdrawn;

  paired := ARRAY[]::UUID[];

  IF players IS NOT NULL AND array_length(players, 1) > 0 THEN
    FOR i IN 1..array_length(players, 1) LOOP
      IF NOT (players[i] = ANY(paired)) THEN
        FOR j IN (i+1)..array_length(players, 1) LOOP
          IF NOT (players[j] = ANY(paired)) AND NOT EXISTS (
            SELECT 1 FROM public.tournament_pairings
            WHERE tournament_id = t_id
              AND ((white_id = players[i] AND black_id = players[j])
                OR (white_id = players[j] AND black_id = players[i]))
          ) THEN
            white_player := players[i]; black_player := players[j];
            
            INSERT INTO public.tournament_pairings (tournament_id, round, white_id, black_id, result)
            VALUES (t_id, t.current_round, white_player, black_player, 'pending');
            paired := paired || players[i] || players[j];
            EXIT;
          END IF;
        END LOOP;
        
        -- Bye logic
        IF NOT (players[i] = ANY(paired)) THEN
          INSERT INTO public.tournament_pairings (tournament_id, round, white_id, black_id, result)
          VALUES (t_id, t.current_round, players[i], NULL, 'bye');
          UPDATE public.tournament_players 
          SET score = score + 1, wins = wins + 1 
          WHERE tournament_id = t_id AND user_id = players[i];
          paired := paired || players[i];
        END IF;
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC: swiss_submit_result
CREATE OR REPLACE FUNCTION swiss_submit_result(pairing_id UUID, result TEXT)
RETURNS void AS $$
DECLARE 
  p public.tournament_pairings%ROWTYPE;
  t public.tournaments%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.tournament_pairings WHERE id = pairing_id;
  
  -- Prevent double scoring
  IF p.result != 'pending' THEN
    RETURN;
  END IF;

  UPDATE public.tournament_pairings SET result = swiss_submit_result.result WHERE id = pairing_id;

  IF swiss_submit_result.result = 'white' THEN
    UPDATE public.tournament_players SET score = score + 1, wins = wins + 1 WHERE tournament_id = p.tournament_id AND user_id = p.white_id;
    UPDATE public.tournament_players SET losses = losses + 1 WHERE tournament_id = p.tournament_id AND user_id = p.black_id;
  ELSIF swiss_submit_result.result = 'black' THEN
    UPDATE public.tournament_players SET score = score + 1, wins = wins + 1 WHERE tournament_id = p.tournament_id AND user_id = p.black_id;
    UPDATE public.tournament_players SET losses = losses + 1 WHERE tournament_id = p.tournament_id AND user_id = p.white_id;
  ELSE
    UPDATE public.tournament_players SET score = score + 0.5, draws = draws + 1 WHERE tournament_id = p.tournament_id AND user_id IN (p.white_id, p.black_id);
  END IF;

  -- Re-rank
  UPDATE public.tournament_players tp SET rank = sub.rank FROM (
    SELECT user_id, RANK() OVER (ORDER BY score DESC, wins DESC) as rank
    FROM public.tournament_players WHERE tournament_id = p.tournament_id
  ) sub WHERE tp.user_id = sub.user_id AND tp.tournament_id = p.tournament_id;

  SELECT * INTO t FROM public.tournaments WHERE id = p.tournament_id;
  
  -- Check round completion
  IF NOT EXISTS (
    SELECT 1 FROM public.tournament_pairings 
    WHERE tournament_id = p.tournament_id 
      AND round = p.round 
      AND result = 'pending'
  ) THEN
    IF t.current_round >= t.total_rounds THEN
      PERFORM complete_tournament(p.tournament_id);
    ELSE
      PERFORM generate_swiss_round(p.tournament_id);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. RPC: arena_submit_result
CREATE OR REPLACE FUNCTION arena_submit_result(
  t_id UUID, game_id UUID, winner_id UUID, is_draw BOOLEAN
) RETURNS void AS $$
DECLARE
  white_uid UUID; black_uid UUID;
  w_consec INTEGER; b_consec INTEGER;
  w_points NUMERIC; b_points NUMERIC;
BEGIN
  -- Prevent double submit
  IF EXISTS (SELECT 1 FROM public.tournament_pairings WHERE game_id = arena_submit_result.game_id) THEN
    RETURN;
  END IF;

  SELECT white_id, black_id INTO white_uid, black_uid FROM public.online_games WHERE id = game_id;

  SELECT COALESCE(consecutive_wins, 0) INTO w_consec FROM public.tournament_players WHERE tournament_id = t_id AND user_id = white_uid;
  SELECT COALESCE(consecutive_wins, 0) INTO b_consec FROM public.tournament_players WHERE tournament_id = t_id AND user_id = black_uid;

  IF is_draw THEN
    w_points := 1; b_points := 1;
    UPDATE public.tournament_players SET score = score + 1, draws = draws + 1, consecutive_wins = 0
      WHERE tournament_id = t_id AND user_id IN (white_uid, black_uid);
  ELSIF winner_id = white_uid THEN
    w_points := CASE WHEN w_consec >= 2 THEN 3 ELSE 2 END;
    UPDATE public.tournament_players SET score = score + w_points, wins = wins + 1, consecutive_wins = consecutive_wins + 1 WHERE tournament_id = t_id AND user_id = white_uid;
    UPDATE public.tournament_players SET losses = losses + 1, consecutive_wins = 0 WHERE tournament_id = t_id AND user_id = black_uid;
  ELSE
    b_points := CASE WHEN b_consec >= 2 THEN 3 ELSE 2 END;
    UPDATE public.tournament_players SET score = score + b_points, wins = wins + 1, consecutive_wins = consecutive_wins + 1 WHERE tournament_id = t_id AND user_id = black_uid;
    UPDATE public.tournament_players SET losses = losses + 1, consecutive_wins = 0 WHERE tournament_id = t_id AND user_id = white_uid;
  END IF;

  INSERT INTO public.tournament_pairings (tournament_id, round, white_id, black_id, game_id, result)
  VALUES (t_id, 0, white_uid, black_uid, game_id, CASE WHEN is_draw THEN 'draw' WHEN winner_id = white_uid THEN 'white' ELSE 'black' END);

  -- Update rank
  UPDATE public.tournament_players tp SET rank = sub.rank FROM (
    SELECT user_id, RANK() OVER (ORDER BY score DESC, wins DESC) as rank
    FROM public.tournament_players WHERE tournament_id = t_id
  ) sub WHERE tp.user_id = sub.user_id AND tp.tournament_id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. RPC: get_arena_opponent
CREATE OR REPLACE FUNCTION get_arena_opponent(t_id UUID, requesting_user UUID)
RETURNS UUID AS $$
  SELECT tp.user_id FROM public.tournament_players tp
  WHERE tp.tournament_id = t_id
    AND tp.user_id != requesting_user
    AND NOT tp.withdrawn
    AND NOT EXISTS (
      SELECT 1 FROM public.tournament_pairings p
      WHERE p.tournament_id = t_id
        AND ((p.white_id = requesting_user AND p.black_id = tp.user_id)
          OR (p.black_id = requesting_user AND p.white_id = tp.user_id))
        AND p.result != 'pending'
    )
  ORDER BY ABS(tp.score - COALESCE((SELECT score FROM public.tournament_players WHERE tournament_id = t_id AND user_id = requesting_user), 0))
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 16. Add tournament_players and tournament_pairings to realtime replication publication if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_players;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_pairings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;
END$$;

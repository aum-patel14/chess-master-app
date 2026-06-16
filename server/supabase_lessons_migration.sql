-- Supabase migration for ChessMaster Pro Lessons & Courses System

-- 1. Create Types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_level') THEN
    CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_step_type') THEN
    CREATE TYPE lesson_step_type AS ENUM ('theory', 'challenge', 'quiz');
  END IF;
END$$;

-- 2. Add role column to public.users if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 3. Create Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  level skill_level NOT NULL,
  category TEXT NOT NULL,         -- 'tactics' | 'openings' | 'endgames' | 'strategy' | 'fundamentals'
  thumbnail_emoji TEXT,           -- e.g. '♟'
  xp_reward INTEGER DEFAULT 100,
  lesson_count INTEGER DEFAULT 0,
  estimated_minutes INTEGER,
  is_published BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  xp_reward INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create Lesson Steps Table
CREATE TABLE IF NOT EXISTS public.lesson_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type lesson_step_type NOT NULL,
  title TEXT,
  content TEXT,                   -- markdown text for theory
  fen TEXT,                       -- starting position
  solution_moves TEXT[],          -- ['e2e4','d7d5'] UCI
  hint TEXT,
  explanation TEXT,
  arrows JSONB,                   -- [{from:'e2',to:'e4',color:'green'}]
  highlights JSONB                -- [{square:'e4',color:'yellow'}]
);

-- 6. Create User Progress Tables
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  steps_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lessons_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- 7. Create Indexes
CREATE INDEX IF NOT EXISTS lessons_course_id_position_idx ON public.lessons(course_id, position);
CREATE INDEX IF NOT EXISTS lesson_steps_lesson_id_position_idx ON public.lesson_steps(lesson_id, position);
CREATE INDEX IF NOT EXISTS user_lesson_progress_user_completed_idx ON public.user_lesson_progress(user_id, completed);

-- 8. Create Auto-update trigger for lesson_count in courses
CREATE OR REPLACE FUNCTION update_lesson_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses 
    SET lesson_count = (SELECT COUNT(*) FROM public.lessons WHERE course_id = NEW.course_id) 
    WHERE id = NEW.course_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses 
    SET lesson_count = (SELECT COUNT(*) FROM public.lessons WHERE course_id = OLD.course_id) 
    WHERE id = OLD.course_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lesson_count_trigger ON public.lessons;
CREATE TRIGGER lesson_count_trigger 
  AFTER INSERT OR DELETE ON public.lessons 
  FOR EACH ROW EXECUTE FUNCTION update_lesson_count();

-- 9. Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Courses: public read access, write access for users with role='admin'
CREATE POLICY "Allow public read of courses" ON public.courses
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write of courses" ON public.courses
  AS RESTRICTIVE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Lessons: public read access, write access for users with role='admin'
CREATE POLICY "Allow public read of lessons" ON public.lessons
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write of lessons" ON public.lessons
  AS RESTRICTIVE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Lesson Steps: public read access, write access for users with role='admin'
CREATE POLICY "Allow public read of lesson_steps" ON public.lesson_steps
  FOR SELECT USING (true);

CREATE POLICY "Allow admin write of lesson_steps" ON public.lesson_steps
  AS RESTRICTIVE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- User Progress: users can read/write their own progress only
CREATE POLICY "Allow users to read own lesson progress" ON public.user_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to write own lesson progress" ON public.user_lesson_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to read own course progress" ON public.user_course_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to write own course progress" ON public.user_course_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. Seed 15 Starter Courses
INSERT INTO public.courses (slug, title, description, level, category, thumbnail_emoji, xp_reward, estimated_minutes, is_published, is_ai_generated) VALUES
  ('how-pieces-move', 'How the pieces move', 'Learn the basic movements, capture rules, and abilities of all chess pieces from pawn to king.', 'beginner', 'fundamentals', '♟', 50, 20, true, false),
  ('check-checkmate-stalemate', 'Check, checkmate & stalemate', 'Understand the fundamental goals of chess: putting the king in check, delivering checkmate, and avoiding stalemate.', 'beginner', 'fundamentals', '👑', 75, 25, true, false),
  ('basic-tactics-fork', 'Your first tactic: the fork', 'Learn how to attack two pieces at once using a single piece to win material and dominate the board.', 'beginner', 'tactics', '🍴', 100, 30, true, false),
  ('control-the-center', 'Why the center matters', 'Discover why controlling the four central squares is the key to launching successful attacks and positioning your pieces.', 'beginner', 'strategy', '🎯', 100, 25, true, false),
  ('king-safety-basics', 'Keeping your king safe', 'Master the art of castling, pawn shields, and defensive setups to keep your king secure throughout the game.', 'beginner', 'strategy', '🛡️', 100, 30, true, false),
  
  ('pins-and-skewers', 'Pins & skewers', 'Unlock the power of line pieces to trap opponent pieces behind each other and win decisive material.', 'intermediate', 'tactics', '📌', 150, 35, true, false),
  ('italian-game', 'The Italian game', 'Learn one of the oldest, most popular, and instructive chess openings for white and black.', 'intermediate', 'openings', '🇮🇹', 150, 40, true, false),
  ('rook-endgames', 'Rook endgames', 'Master the fundamental rook and pawn endgames including the Philidor and Lucena positions.', 'intermediate', 'endgames', '🏰', 150, 45, true, false),
  ('discovered-attacks', 'Discovered attacks', 'Learn how to move one piece to unleash a devastating hidden attack from another long-range piece.', 'intermediate', 'tactics', '💥', 150, 35, true, false),
  ('pawn-structure', 'Pawn structure fundamentals', 'Understand pawn chains, isolated pawns, doubled pawns, and how they dictate the planning of the game.', 'intermediate', 'strategy', '🧱', 150, 40, true, false),
  
  ('sicilian-defence', 'The Sicilian defence', 'Explore the sharpest and most aggressive response for black against 1.e4 to play for a win from move one.', 'advanced', 'openings', '🌋', 200, 60, true, false),
  ('endgame-technique', 'Endgame technique', 'Learn how to convert small advantages, activate your king, and calculate key pawn breakthroughs in the late game.', 'advanced', 'endgames', '⌛', 200, 60, true, false),
  ('positional-chess', 'Positional chess', 'Master prophylaxis, outposts, weak squares, and long-term planning without immediate tactical combinations.', 'advanced', 'strategy', '🔍', 200, 55, true, false),
  ('back-rank-mates', 'Back rank mates', 'Exploit the weakness of an opponent castled king trapped behind their own pawns to deliver checkmate.', 'advanced', 'tactics', '🚨', 200, 40, true, false),
  ('queen-vs-rook', 'Queen vs rook endgame', 'Master the complex and highly theoretical endgame of winning with a queen against a lone defending rook.', 'advanced', 'endgames', '⚔️', 200, 50, true, false)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  category = EXCLUDED.category,
  thumbnail_emoji = EXCLUDED.thumbnail_emoji,
  xp_reward = EXCLUDED.xp_reward,
  estimated_minutes = EXCLUDED.estimated_minutes,
  is_published = EXCLUDED.is_published;

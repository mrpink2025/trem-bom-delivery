-- Fix critical RLS security issues
-- Enable RLS on tables that don't have it enabled

-- Check and enable RLS on game_matches if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'game_matches'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Create RLS policies for game_matches if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'game_matches'
    AND policyname = 'Users can view public matches'
  ) THEN
    CREATE POLICY "Users can view public matches" ON public.game_matches
      FOR SELECT USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'game_matches'
    AND policyname = 'Users can create matches'
  ) THEN
    CREATE POLICY "Users can create matches" ON public.game_matches
      FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'game_matches'
    AND policyname = 'Users can update their matches'
  ) THEN
    CREATE POLICY "Users can update their matches" ON public.game_matches
      FOR UPDATE USING (auth.uid() = created_by);
  END IF;
END
$$;
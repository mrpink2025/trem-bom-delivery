-- Ensure game_state column exists in pool_matches table
ALTER TABLE public.pool_matches
  ADD COLUMN IF NOT EXISTS game_state jsonb DEFAULT '{}'::jsonb;
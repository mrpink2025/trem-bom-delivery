-- Adicionar coluna game_state se não existir
ALTER TABLE public.pool_matches
  ADD COLUMN IF NOT EXISTS game_state jsonb DEFAULT '{}'::jsonb;
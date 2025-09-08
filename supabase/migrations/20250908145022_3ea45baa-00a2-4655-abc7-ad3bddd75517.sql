-- Tabela de eventos por partida
CREATE TABLE IF NOT EXISTS public.pool_events (
  id          bigserial PRIMARY KEY,
  match_id    uuid NOT NULL REFERENCES public.pool_matches(id) ON DELETE CASCADE,
  seq         integer NOT NULL,
  type        text NOT NULL,                       -- 'sim_start' | 'sim_frames' | 'sim_end' | ...
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pool_events_match_seq ON public.pool_events(match_id, seq);

ALTER TABLE public.pool_events ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas quem participa da partida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
     WHERE tablename='pool_events' AND policyname='pool_events_read_participants'
  ) THEN
    CREATE POLICY pool_events_read_participants ON public.pool_events
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.pool_matches m
           WHERE m.id = pool_events.match_id
             AND (m.creator_user_id = auth.uid() OR m.opponent_user_id = auth.uid())
        )
      );
  END IF;
END$$;

-- Garantir a coluna game_state na partida
ALTER TABLE public.pool_matches
  ADD COLUMN IF NOT EXISTS game_state jsonb DEFAULT '{}'::jsonb;
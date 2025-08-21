-- 🔧 Corrigir erro de sintaxe e finalizar melhorias

-- 1. Índices críticos para performance em tempo real
CREATE INDEX IF NOT EXISTS idx_messages_thread_created 
ON public.messages (thread_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_order_unique 
ON public.chat_threads (order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_timestamp 
ON public.delivery_tracking (order_id, timestamp DESC);

-- 2. Índice GiST para consultas geoespaciais (latitude, longitude)
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_geo 
ON public.delivery_tracking USING GIST (point(longitude, latitude));

-- 3. Validação para garantir que tabela stripe_events existe
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT,
  processed BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Índice para performance na checagem de eventos duplicados
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id 
ON public.stripe_events (event_id);

-- 4. RLS para stripe_events (DROP e CREATE para evitar conflito)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage stripe events" ON public.stripe_events;
CREATE POLICY "System can manage stripe events" 
ON public.stripe_events 
FOR ALL 
USING (true);
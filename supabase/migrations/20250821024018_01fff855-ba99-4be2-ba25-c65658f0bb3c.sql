-- 🔧 Corrigir com as colunas corretas da tabela stripe_events

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

-- 3. Índice para performance na checagem de eventos duplicados (usando coluna existente)
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id 
ON public.stripe_events (stripe_event_id);
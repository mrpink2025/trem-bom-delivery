-- 🔧 Melhorias Performance & Segurança - Finais

-- 1. Verificar se função update_order_status_v2 existe e está correta
-- Se não, criar versão atualizada que aceita p_actor_id opcional
CREATE OR REPLACE FUNCTION public.update_order_status_v2(
  p_order_id UUID, 
  p_new_status TEXT, 
  p_courier_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_old_status TEXT;
  v_history_entry JSONB;
  v_valid_transition BOOLEAN := false;
  v_actor_id UUID;
  v_actor_role TEXT;
BEGIN
  -- Determinar actor_id (webhook service role ou auth.uid())
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  
  -- Determinar role do actor
  IF v_actor_id IS NULL THEN
    v_actor_role := 'system';
  ELSE
    SELECT role::text INTO v_actor_role 
    FROM public.profiles 
    WHERE user_id = v_actor_id;
    v_actor_role := COALESCE(v_actor_role, 'unknown');
  END IF;
  
  -- Buscar pedido atual
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  
  v_old_status := v_order.status;
  
  -- Validar transições permitidas (incluindo pending_payment como text)
  CASE v_old_status
    WHEN 'pending_payment' THEN
      v_valid_transition := p_new_status IN ('confirmed', 'cancelled', 'placed');
    WHEN 'placed' THEN
      v_valid_transition := p_new_status IN ('confirmed', 'cancelled');
    WHEN 'confirmed' THEN
      v_valid_transition := p_new_status IN ('preparing', 'cancelled');
    WHEN 'preparing' THEN
      v_valid_transition := p_new_status IN ('ready', 'cancelled');
    WHEN 'ready' THEN
      v_valid_transition := p_new_status IN ('out_for_delivery', 'cancelled');
    WHEN 'out_for_delivery' THEN
      v_valid_transition := p_new_status IN ('delivered', 'cancelled');
    ELSE
      v_valid_transition := true;
  END CASE;
  
  IF NOT v_valid_transition THEN
    RETURN json_build_object('success', false, 'error', 'Transição de status inválida');
  END IF;
  
  -- Criar entrada do histórico com actor correto
  v_history_entry := json_build_object(
    'status', p_new_status,
    'timestamp', now(),
    'actor_id', v_actor_id,
    'actor_role', v_actor_role
  );
  
  -- Atualizar pedido
  UPDATE public.orders
  SET 
    status = p_new_status,
    status_updated_at = now(),
    status_history = COALESCE(status_history, '[]'::jsonb) || v_history_entry::jsonb,
    courier_id = CASE WHEN p_courier_id IS NOT NULL THEN p_courier_id ELSE courier_id END,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Criar notificação
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    v_order.user_id,
    'Status do Pedido Atualizado',
    'Seu pedido foi atualizado para: ' || p_new_status,
    'order_status',
    json_build_object('order_id', p_order_id, 'new_status', p_new_status)
  );
  
  RETURN json_build_object(
    'success', true, 
    'old_status', v_old_status, 
    'new_status', p_new_status,
    'actor', v_actor_role
  );
END;
$function$;

-- 2. Índices críticos para performance em tempo real
CREATE INDEX IF NOT EXISTS idx_messages_thread_created 
ON public.messages (thread_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_order_unique 
ON public.chat_threads (order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_timestamp 
ON public.delivery_tracking (order_id, timestamp DESC);

-- 3. Índice GiST para consultas geoespaciais (latitude, longitude)
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_geo 
ON public.delivery_tracking USING GIST (point(longitude, latitude));

-- 4. Validação para garantir que tabela stripe_events existe com estrutura correta
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

-- RLS para stripe_events
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "System can manage stripe events" 
ON public.stripe_events 
FOR ALL 
USING (true);
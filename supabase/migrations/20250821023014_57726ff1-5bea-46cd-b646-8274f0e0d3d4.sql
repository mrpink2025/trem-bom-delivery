-- Etapa 2: Agora podemos adicionar CHECK constraint e outras melhorias
-- 1. Adicionar CHECK constraint para orders.status
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'placed', 'confirmed', 'preparing', 'ready', 
  'out_for_delivery', 'delivered', 'cancelled', 'pending_payment'
));

-- 2. Criar índice GiST para consultas geoespaciais em delivery_tracking
-- Usar point() do PostgreSQL built-in
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_location_point 
ON public.delivery_tracking (point(longitude, latitude));

-- 3. Melhorar webhook com idempotência mais robusta
CREATE OR REPLACE FUNCTION public.process_stripe_webhook(
  p_event_id TEXT,
  p_event_type TEXT,
  p_event_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_processed BOOLEAN := FALSE;
BEGIN
  -- Verificar idempotência
  SELECT EXISTS(
    SELECT 1 FROM public.stripe_events 
    WHERE event_id = p_event_id AND processed = TRUE
  ) INTO v_already_processed;
  
  IF v_already_processed THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Event already processed',
      'event_id', p_event_id
    );
  END IF;
  
  -- Marcar como sendo processado
  INSERT INTO public.stripe_events (event_id, processed, metadata)
  VALUES (p_event_id, TRUE, p_event_data)
  ON CONFLICT (event_id) 
  DO UPDATE SET processed = TRUE, metadata = EXCLUDED.metadata;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Event processed successfully',
    'event_id', p_event_id
  );
END;
$function$;

-- 4. Função para validar consistência de dados
CREATE OR REPLACE FUNCTION public.validate_data_consistency()
RETURNS TABLE(
  table_name TEXT,
  issue_type TEXT,
  issue_count BIGINT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar orders sem payment records
  RETURN QUERY
  SELECT 
    'orders'::TEXT,
    'missing_payment'::TEXT,
    COUNT(*)::BIGINT,
    'Orders with stripe_session_id but no payment record'::TEXT
  FROM public.orders o
  WHERE o.stripe_session_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.stripe_session_id = o.stripe_session_id
    );
    
  -- Verificar messages órfãos
  RETURN QUERY
  SELECT 
    'messages'::TEXT,
    'orphaned_messages'::TEXT,
    COUNT(*)::BIGINT,
    'Messages with non-existent thread_id'::TEXT
  FROM public.messages m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_threads ct 
    WHERE ct.id = m.thread_id
  );
  
  -- Verificar delivery_tracking sem order
  RETURN QUERY
  SELECT 
    'delivery_tracking'::TEXT,
    'orphaned_tracking'::TEXT,
    COUNT(*)::BIGINT,
    'Tracking records with non-existent order_id'::TEXT
  FROM public.delivery_tracking dt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = dt.order_id
  );
END;
$function$;
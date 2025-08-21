-- 1. Adicionar status 'pending_payment' ao enum order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment';

-- 2. Agora adicionar CHECK constraint para orders.status
-- Remover constraint existente se houver
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'orders_status_check') THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

-- Adicionar nova constraint incluindo pending_payment
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'placed', 'confirmed', 'preparing', 'ready', 
  'out_for_delivery', 'delivered', 'cancelled', 'pending_payment'
));

-- 3. Criar índice GiST para consultas geoespaciais em delivery_tracking
-- Verificar se PostGIS está disponível, senão usar índice composto simples
DO $$
BEGIN
  -- Tentar criar índice GiST
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_delivery_tracking_location_gist 
    ON public.delivery_tracking USING GIST (point(longitude, latitude));
  EXCEPTION 
    WHEN undefined_function THEN
      -- Se GiST não estiver disponível, criar índice composto simples
      CREATE INDEX IF NOT EXISTS idx_delivery_tracking_lat_lng 
      ON public.delivery_tracking (latitude, longitude);
  END;
END $$;

-- 4. Melhorar webhook com idempotência mais robusta
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
  v_result JSON;
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
  
  -- Log do processamento
  INSERT INTO public.audit_logs (
    table_name, operation, new_values, user_id
  ) VALUES (
    'stripe_events', 'WEBHOOK_PROCESSED',
    jsonb_build_object(
      'event_id', p_event_id,
      'event_type', p_event_type,
      'processed_at', now()
    ),
    NULL -- System operation
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Event processed successfully',
    'event_id', p_event_id
  );
END;
$function$;

-- 5. Função para validar consistência de dados
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
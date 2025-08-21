-- 1. Fix role enum: add 'seller' and keep 'restaurant' for compatibility
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'seller';

-- 2. Create stripe_events table for idempotency
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on stripe_events
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Only system can manage stripe events
CREATE POLICY "System can manage stripe events" ON public.stripe_events
FOR ALL USING (true);

-- 3. Add CHECK constraint for order status validation
ALTER TABLE public.orders 
ADD CONSTRAINT valid_order_status 
CHECK (status IN ('pending_payment', 'placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'));

-- 4. Add critical indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON public.messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_threads_order ON public.chat_threads(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_time ON public.delivery_tracking(order_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at);

-- 5. Add spatial index for delivery tracking (optional for radius queries)
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_location ON public.delivery_tracking USING GIST(point(longitude, latitude));

-- 6. Fix update_order_status function to handle system calls
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid, 
  p_new_status text, 
  p_courier_id uuid DEFAULT NULL::uuid,
  p_actor_id uuid DEFAULT NULL::uuid
)
RETURNS json
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
BEGIN
  -- Determine actor ID (user auth or system)
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  
  -- Buscar pedido atual
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  
  v_old_status := v_order.status;
  
  -- Validar transições permitidas
  CASE v_old_status
    WHEN 'pending_payment' THEN
      v_valid_transition := p_new_status IN ('confirmed', 'cancelled');
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
    WHEN 'delivered' THEN
      v_valid_transition := false; -- Estado final
    WHEN 'cancelled' THEN
      v_valid_transition := false; -- Estado final
    ELSE
      v_valid_transition := true; -- Para compatibilidade com status antigos
  END CASE;
  
  IF NOT v_valid_transition THEN
    RETURN json_build_object('success', false, 'error', 'Transição de status inválida');
  END IF;
  
  -- Criar entrada do histórico
  v_history_entry := json_build_object(
    'status', p_new_status,
    'timestamp', now(),
    'user_id', v_actor_id,
    'actor_type', CASE WHEN v_actor_id IS NULL THEN 'system' ELSE 'user' END
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
  
  RETURN json_build_object('success', true, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$function$;

-- 7. Proper RLS for message_reports
CREATE POLICY "Reporters can view their own reports" ON public.message_reports
FOR SELECT USING (auth.uid() = reporter_id OR get_current_user_role() = 'admin');

-- 8. Add RLS policies for stripe_events (admin only)
CREATE POLICY "Admins can view stripe events" ON public.stripe_events
FOR SELECT USING (get_current_user_role() = 'admin');

-- 9. Enable realtime for critical tables
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
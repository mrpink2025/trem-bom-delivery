-- 🔐 CORREÇÕES CRÍTICAS: Race Conditions + Webhook Security + Storage RLS

-- 1. Melhorar update_order_status_v2 com row locking e validação robusta
CREATE OR REPLACE FUNCTION public.update_order_status_v3(
  p_order_id UUID,
  p_new_status order_status,
  p_actor_id UUID DEFAULT NULL,
  p_validation_data JSONB DEFAULT '{}'::jsonb
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_current_status order_status;
  v_actor_id UUID;
  v_actor_role TEXT;
  v_valid_transition BOOLEAN := false;
  v_history_entry JSONB;
BEGIN
  -- Determinar actor
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  
  IF v_actor_id IS NULL THEN
    v_actor_role := 'system';
  ELSE
    SELECT role::text INTO v_actor_role 
    FROM public.profiles 
    WHERE user_id = v_actor_id;
    v_actor_role := COALESCE(v_actor_role, 'unknown');
  END IF;
  
  -- 🔒 ROW LOCK: Previne race conditions
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE; -- Trava a linha!
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  v_current_status := v_order.status;
  
  -- Validar transições (com rollbacks controlados)
  CASE v_current_status
    WHEN 'pending_payment' THEN
      v_valid_transition := p_new_status IN ('confirmed', 'cancelled', 'placed');
    WHEN 'placed' THEN
      v_valid_transition := p_new_status IN ('confirmed', 'cancelled');
    WHEN 'confirmed' THEN
      v_valid_transition := p_new_status IN ('preparing', 'cancelled');
    WHEN 'preparing' THEN
      v_valid_transition := p_new_status IN ('ready', 'cancelled', 'confirmed'); -- rollback permitido
    WHEN 'ready' THEN
      v_valid_transition := p_new_status IN ('out_for_delivery', 'cancelled', 'preparing'); -- rollback permitido
    WHEN 'out_for_delivery' THEN
      v_valid_transition := p_new_status IN ('delivered', 'ready'); -- rollback logístico permitido
    WHEN 'delivered' THEN
      v_valid_transition := false; -- Estado final
    WHEN 'cancelled' THEN
      v_valid_transition := false; -- Estado final
    ELSE
      v_valid_transition := true; -- Compatibilidade
  END CASE;
  
  IF NOT v_valid_transition THEN
    -- Log da tentativa inválida
    INSERT INTO public.audit_logs (
      table_name, record_id, operation, 
      old_values, new_values, user_id
    ) VALUES (
      'orders', p_order_id, 'INVALID_TRANSITION_ATTEMPT',
      jsonb_build_object('from_status', v_current_status, 'to_status', p_new_status),
      jsonb_build_object('actor_id', v_actor_id, 'actor_role', v_actor_role, 'validation_data', p_validation_data),
      v_actor_id
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'Invalid status transition',
      'from_status', v_current_status,
      'to_status', p_new_status
    );
  END IF;
  
  -- Criar entrada do histórico
  v_history_entry := json_build_object(
    'status', p_new_status,
    'timestamp', now(),
    'actor_id', v_actor_id,
    'actor_role', v_actor_role,
    'validation_data', p_validation_data
  );
  
  -- Atualizar pedido (dentro da transação com lock)
  UPDATE public.orders
  SET 
    status = p_new_status,
    status_updated_at = now(),
    status_history = COALESCE(status_history, '[]'::jsonb) || v_history_entry::jsonb,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Registrar evento de auditoria
  INSERT INTO public.order_events (
    order_id, 
    status, 
    actor_id, 
    actor_role,
    notes,
    metadata
  ) VALUES (
    p_order_id,
    p_new_status,
    v_actor_id,
    v_actor_role,
    CASE 
      WHEN p_new_status = 'confirmed' THEN 'Pedido confirmado'
      WHEN p_new_status = 'preparing' THEN 'Pedido em preparação'
      WHEN p_new_status = 'ready' THEN 'Pedido pronto'
      WHEN p_new_status = 'out_for_delivery' THEN 'Saiu para entrega'
      WHEN p_new_status = 'delivered' THEN 'Pedido entregue'
      WHEN p_new_status = 'cancelled' THEN 'Pedido cancelado'
      ELSE 'Status alterado'
    END,
    jsonb_build_object(
      'old_status', v_current_status,
      'new_status', p_new_status,
      'timestamp', now(),
      'validation_data', p_validation_data
    )
  );
  
  -- Criar notificação para o usuário
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (
    v_order.user_id,
    'Status do Pedido Atualizado',
    'Seu pedido foi atualizado para: ' || p_new_status::text,
    'order_status',
    json_build_object(
      'order_id', p_order_id, 
      'new_status', p_new_status,
      'old_status', v_current_status
    )
  );
  
  RETURN json_build_object(
    'success', true, 
    'old_status', v_current_status, 
    'new_status', p_new_status,
    'actor_role', v_actor_role,
    'locked', true
  );
END;
$$;
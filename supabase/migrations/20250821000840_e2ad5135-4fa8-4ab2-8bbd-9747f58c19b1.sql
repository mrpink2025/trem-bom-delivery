-- Alterar tabela orders para suportar máquina de estados e histórico
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Criar enum para status de pedido
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'placed',
    'confirmed', 
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Alterar coluna status para usar o enum (se necessário)
-- Como já existe uma coluna status como text, vamos manter por compatibilidade

-- Criar função para transição de estados
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_courier_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_old_status TEXT;
  v_history_entry JSONB;
  v_valid_transition BOOLEAN := false;
BEGIN
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
    'user_id', auth.uid()
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
$$;

-- Trigger para atualizar status_updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_order_status_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_order_status_timestamp_trigger ON public.orders;
CREATE TRIGGER update_order_status_timestamp_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_status_timestamp();
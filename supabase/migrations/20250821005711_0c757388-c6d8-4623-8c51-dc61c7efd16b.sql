-- 1. Criar tabela de eventos do Stripe para idempotência
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Criar tabela de eventos de pedidos para timeline robusta
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  status order_status NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Adicionar colunas necessárias na tabela payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

-- 4. Migrar coluna status da tabela orders para usar ENUM
DO $$
BEGIN
  -- Verificar se a coluna ainda é texto
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'status' 
    AND data_type = 'text'
  ) THEN
    -- Primeiro, atualizar valores 'pending' para 'placed'
    UPDATE public.orders SET status = 'placed' WHERE status = 'pending';
    
    -- Remover valor padrão
    ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
    
    -- Alterar tipo da coluna
    ALTER TABLE public.orders ALTER COLUMN status TYPE order_status USING status::order_status;
    
    -- Redefinir valor padrão
    ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'placed'::order_status;
  END IF;
END $$;

-- 5. Função para validar transições de status
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é inserção, permitir qualquer status inicial
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Validar transições permitidas
  CASE OLD.status
    WHEN 'placed' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('preparing', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'preparing' THEN
      IF NEW.status NOT IN ('ready', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'ready' THEN
      IF NEW.status NOT IN ('out_for_delivery', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'out_for_delivery' THEN
      IF NEW.status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'delivered' THEN
      -- Estado final - não pode mudar
      RAISE EXCEPTION 'Cannot change status from delivered';
    WHEN 'cancelled' THEN
      -- Estado final - não pode mudar  
      RAISE EXCEPTION 'Cannot change status from cancelled';
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para validação de status (remover se existir)
DROP TRIGGER IF EXISTS validate_order_status_transition_trigger ON public.orders;
CREATE TRIGGER validate_order_status_transition_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

-- 7. Função para registrar eventos de pedido
CREATE OR REPLACE FUNCTION public.log_order_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar evento de mudança de status
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events (
      order_id, 
      status, 
      actor_id, 
      actor_role,
      notes,
      metadata
    ) VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),
      COALESCE((SELECT role::text FROM public.profiles WHERE user_id = auth.uid()), 'system'),
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Pedido confirmado pelo restaurante'
        WHEN NEW.status = 'preparing' THEN 'Pedido em preparação'
        WHEN NEW.status = 'ready' THEN 'Pedido pronto para retirada'
        WHEN NEW.status = 'out_for_delivery' THEN 'Pedido saiu para entrega'
        WHEN NEW.status = 'delivered' THEN 'Pedido entregue'
        WHEN NEW.status = 'cancelled' THEN 'Pedido cancelado'
        ELSE 'Status alterado'
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'courier_id', NEW.courier_id,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para log de eventos (remover se existir)
DROP TRIGGER IF EXISTS log_order_event_trigger ON public.orders;
CREATE TRIGGER log_order_event_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_event();

-- 9. RLS para stripe_events (apenas sistema)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage stripe events" ON public.stripe_events;
CREATE POLICY "System can manage stripe events" ON public.stripe_events
FOR ALL USING (true);

-- 10. RLS para order_events
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events for their orders" ON public.order_events;
CREATE POLICY "Users can view events for their orders" ON public.order_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_events.order_id 
    AND (
      user_id = auth.uid() OR
      courier_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.restaurants 
        WHERE id = orders.restaurant_id AND owner_id = auth.uid()
      )
    )
  ) OR
  has_role('admin'::user_role)
);

DROP POLICY IF EXISTS "System can insert order events" ON public.order_events;
CREATE POLICY "System can insert order events" ON public.order_events
FOR INSERT WITH CHECK (true);

-- 11. Índices para performance
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON public.order_events(created_at);
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_id ON public.stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_event_id ON public.payments(stripe_event_id) WHERE stripe_event_id IS NOT NULL;
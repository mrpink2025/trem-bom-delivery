
-- Tabela para rastrear bloqueios de usuários
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'PAYMENT_ISSUES',
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  cancelled_orders_count INTEGER DEFAULT 0,
  created_by UUID DEFAULT NULL, -- Para bloqueios manuais por admin
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem seus próprios bloqueios
CREATE POLICY "Users can view their own blocks" 
  ON user_blocks 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para admins gerenciarem bloqueios
CREATE POLICY "Admins can manage user blocks" 
  ON user_blocks 
  FOR ALL 
  USING (has_role('admin'::user_role));

-- Política para sistema inserir bloqueios
CREATE POLICY "System can insert blocks" 
  ON user_blocks 
  FOR INSERT 
  WITH CHECK (true);

-- Função para cancelar pedidos não confirmados
CREATE OR REPLACE FUNCTION cancel_unconfirmed_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_cancelled_count INTEGER;
BEGIN
  -- Buscar pedidos pendentes há mais de 20 minutos
  FOR v_order IN
    SELECT id, user_id, created_at
    FROM orders 
    WHERE status = 'pending_payment' 
      AND created_at < (now() - interval '20 minutes')
  LOOP
    -- Cancelar pedido
    UPDATE orders 
    SET 
      status = 'cancelled',
      updated_at = now()
    WHERE id = v_order.id;
    
    -- Log da ação
    INSERT INTO audit_logs (
      table_name, record_id, operation, 
      old_values, new_values, user_id
    ) VALUES (
      'orders', v_order.id, 'AUTO_CANCEL_PAYMENT_TIMEOUT',
      jsonb_build_object('status', 'pending_payment'),
      jsonb_build_object('status', 'cancelled', 'reason', 'payment_timeout'),
      v_order.user_id
    );
    
    -- Verificar quantos pedidos foram cancelados nas últimas 24h
    SELECT COUNT(*) INTO v_cancelled_count
    FROM orders 
    WHERE user_id = v_order.user_id
      AND status = 'cancelled'
      AND created_at >= (now() - interval '24 hours');
    
    -- Se >= 3 cancelamentos, bloquear usuário
    IF v_cancelled_count >= 3 THEN
      -- Verificar se já não está bloqueado
      IF NOT EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE user_id = v_order.user_id 
          AND is_active = true 
          AND blocked_until > now()
      ) THEN
        -- Inserir bloqueio de 7 dias
        INSERT INTO user_blocks (
          user_id, block_type, blocked_until, reason, cancelled_orders_count
        ) VALUES (
          v_order.user_id, 
          'PAYMENT_ISSUES',
          now() + interval '7 days',
          'Muitos pedidos cancelados por falta de pagamento (3+ em 24h)',
          v_cancelled_count
        );
        
        -- Log do bloqueio
        INSERT INTO audit_logs (
          table_name, operation, new_values, user_id
        ) VALUES (
          'user_blocks', 'AUTO_BLOCK_PAYMENT_ISSUES',
          jsonb_build_object(
            'user_id', v_order.user_id,
            'cancelled_count', v_cancelled_count,
            'block_duration_days', 7
          ),
          v_order.user_id
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Função para verificar se usuário está bloqueado
CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND blocked_until > now()
  );
END;
$$;

-- Trigger para verificar bloqueios ao criar pedidos
CREATE OR REPLACE FUNCTION check_user_block_before_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_block RECORD;
BEGIN
  -- Verificar se usuário está bloqueado
  SELECT * INTO v_block
  FROM user_blocks 
  WHERE user_id = NEW.user_id 
    AND is_active = true 
    AND blocked_until > now()
  LIMIT 1;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Usuário bloqueado até % por: %', 
      v_block.blocked_until::date, 
      v_block.reason;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS check_user_block_on_order_insert ON orders;
CREATE TRIGGER check_user_block_on_order_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_user_block_before_order();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_pending_payment ON orders(status, created_at) 
  WHERE status = 'pending_payment';
CREATE INDEX IF NOT EXISTS idx_user_blocks_active ON user_blocks(user_id, is_active, blocked_until) 
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_24h ON orders(user_id, status, created_at) 
  WHERE status = 'cancelled';

-- Criar tabela para tokens de notificações push
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON public.push_tokens(active);

-- RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their own push tokens"
ON public.push_tokens
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "System can manage push tokens"
ON public.push_tokens
FOR ALL
USING (true);

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamps automaticamente
CREATE TRIGGER update_push_tokens_updated_at_trigger
    BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_push_tokens_updated_at();

-- Função para aceitar oferta de dispatch (stored procedure)
CREATE OR REPLACE FUNCTION accept_dispatch_offer(
  p_offer_id UUID,
  p_courier_id UUID,
  p_order_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verificar se a oferta ainda é válida
  IF NOT EXISTS (
    SELECT 1 FROM dispatch_offers 
    WHERE id = p_offer_id 
    AND status = 'PENDING' 
    AND expires_at > now()
  ) THEN
    RETURN jsonb_build_object('error', 'Oferta inválida ou expirada');
  END IF;

  -- Marcar oferta como aceita
  UPDATE dispatch_offers 
  SET status = 'ACCEPTED', responded_at = now()
  WHERE id = p_offer_id;

  -- Rejeitar outras ofertas para o mesmo pedido
  UPDATE dispatch_offers 
  SET status = 'REJECTED_AUTO', responded_at = now()
  WHERE order_id = p_order_id 
    AND id != p_offer_id 
    AND status = 'PENDING';

  -- Atualizar status do pedido
  UPDATE orders 
  SET status = 'accepted', updated_at = now()
  WHERE id = p_order_id;

  -- Adicionar à tabela de pedidos ativos do entregador
  INSERT INTO courier_active_orders (courier_id, order_id)
  VALUES (p_courier_id, p_order_id)
  ON CONFLICT (courier_id, order_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;
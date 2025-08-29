-- Primeiro remover funções existentes para recriar com search_path
DROP FUNCTION IF EXISTS public.apply_psychological_rounding(numeric, text);

-- Recriar função com search_path correto
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(price numeric, rounding_type text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  CASE rounding_type
    WHEN 'ROUND_99' THEN
      RETURN floor(price) + 0.99;
    WHEN 'ROUND_90' THEN
      RETURN floor(price) + 0.90;
    WHEN 'ROUND_UP' THEN
      RETURN ceil(price);
    WHEN 'ROUND_DOWN' THEN
      RETURN floor(price);
    ELSE
      RETURN round(price, 2);
  END CASE;
END;
$$;

-- Criar tabela de reviews funcional
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  order_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Políticas para reviews
CREATE POLICY "Users can view all reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Criar tabela de transações de pagamento
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT NOT NULL, -- 'stripe', 'pix', 'cash'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  stripe_payment_intent_id TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de pagamentos
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para pagamentos
CREATE POLICY "Users can view their own payments" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage payments" ON public.payment_transactions
  FOR ALL USING (true);
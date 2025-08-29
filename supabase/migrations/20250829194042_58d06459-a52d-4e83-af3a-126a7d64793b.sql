-- Criar tabela de transações de pagamento apenas se não existir
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

-- Habilitar RLS na tabela de pagamentos apenas se existir
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'payment_transactions' AND schemaname = 'public') THEN
    ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
    
    -- Tentar criar políticas apenas se não existirem
    BEGIN
      CREATE POLICY "Users can view their own payments" ON public.payment_transactions
        FOR SELECT USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Política já existe
    END;

    BEGIN
      CREATE POLICY "System can manage payments" ON public.payment_transactions
        FOR ALL USING (true);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Política já existe
    END;
  END IF;
END
$$;
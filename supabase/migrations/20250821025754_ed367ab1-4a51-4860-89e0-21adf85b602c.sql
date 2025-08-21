-- ✅ Final: Adicionar CHECK constraint para orders.status
-- Primeira verificação se constraint existe
DO $$ 
BEGIN
  -- Tentar dropar constraint se existir (pode estar malformada)
  BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
  EXCEPTION 
    WHEN OTHERS THEN NULL;
  END;
  
  -- Adicionar constraint nova e correta
  ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status::text = ANY(ARRAY[
    'placed'::text, 'confirmed'::text, 'preparing'::text, 
    'ready'::text, 'out_for_delivery'::text, 'delivered'::text, 
    'cancelled'::text, 'pending_payment'::text
  ]));
  
  RAISE NOTICE 'CHECK constraint orders_status_check adicionada com sucesso';
END $$;
-- 🔧 Adicionar CHECK constraint para orders.status (corrigido)
DO $$ 
BEGIN
  -- Verificar se constraint já existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'orders_status_check' 
                 AND table_name = 'orders' 
                 AND table_schema = 'public') THEN
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status::text IN (
      'placed', 'confirmed', 'preparing', 'ready', 
      'out_for_delivery', 'delivered', 'cancelled', 'pending_payment'
    ));
  END IF;
END $$;
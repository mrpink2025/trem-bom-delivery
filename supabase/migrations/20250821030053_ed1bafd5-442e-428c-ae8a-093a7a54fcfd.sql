-- 🎯 DEFINITIVO: Verificar dados e aplicar constraint
-- 1. Primeiro verificar se há dados inválidos
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Contar registros com status inválido
  SELECT COUNT(*) INTO invalid_count
  FROM public.orders 
  WHERE status::text NOT IN (
    'placed', 'confirmed', 'preparing', 'ready', 
    'out_for_delivery', 'delivered', 'cancelled', 'pending_payment'
  );
  
  RAISE NOTICE 'Registros com status inválido: %', invalid_count;
  
  -- Se há registros inválidos, converter para 'placed'
  IF invalid_count > 0 THEN
    UPDATE public.orders 
    SET status = 'placed'::order_status
    WHERE status::text NOT IN (
      'placed', 'confirmed', 'preparing', 'ready', 
      'out_for_delivery', 'delivered', 'cancelled', 'pending_payment'
    );
    RAISE NOTICE 'Convertidos % registros inválidos para "placed"', invalid_count;
  END IF;
  
  -- Agora tentar adicionar constraint
  BEGIN
    -- Dropar se existe
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    -- Adicionar constraint nova
    ALTER TABLE public.orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
      'placed'::order_status, 'confirmed'::order_status, 'preparing'::order_status,
      'ready'::order_status, 'out_for_delivery'::order_status, 'delivered'::order_status,
      'cancelled'::order_status, 'pending_payment'::order_status
    ));
    
    RAISE NOTICE '✅ CHECK constraint orders_status_check aplicada com sucesso!';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao aplicar constraint: %', SQLERRM;
  END;
END $$;
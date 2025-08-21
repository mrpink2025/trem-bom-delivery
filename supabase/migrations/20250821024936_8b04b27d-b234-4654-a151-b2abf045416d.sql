-- 🔧 Adicionar CHECK constraint para orders.status
-- Garantir que apenas valores válidos são permitidos mesmo com enum
ALTER TABLE public.orders 
ADD CONSTRAINT IF NOT EXISTS orders_status_check 
CHECK (status::text IN (
  'placed', 'confirmed', 'preparing', 'ready', 
  'out_for_delivery', 'delivered', 'cancelled', 'pending_payment'
));
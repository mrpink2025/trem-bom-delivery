-- Aplicar CHECK constraint final para orders.status
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_enum_check 
CHECK (status::text IN (
  'placed', 'confirmed', 'preparing', 'ready', 
  'out_for_delivery', 'delivered', 'cancelled', 'pending_payment'
));
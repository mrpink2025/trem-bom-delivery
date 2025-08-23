-- Add foreign key constraint between orders and restaurants
ALTER TABLE public.orders 
ADD CONSTRAINT orders_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) 
REFERENCES public.restaurants(id) 
ON DELETE RESTRICT;
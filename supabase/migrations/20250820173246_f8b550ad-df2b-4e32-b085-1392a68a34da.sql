-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  restaurant_id UUID NOT NULL,
  courier_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_way', 'delivered', 'cancelled')),
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_address JSONB NOT NULL,
  restaurant_address JSONB NOT NULL,
  pickup_location JSONB,
  delivery_location JSONB,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_tracking table
CREATE TABLE public.delivery_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,  
  order_id UUID NOT NULL REFERENCES public.orders(id),
  courier_id UUID NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Couriers can view assigned orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can update their assigned orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = courier_id);

-- Delivery tracking policies
CREATE POLICY "Users can view tracking for their orders" 
ON public.delivery_tracking 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = delivery_tracking.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Couriers can insert their own tracking" 
ON public.delivery_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = courier_id);

CREATE POLICY "Couriers can view their own tracking" 
ON public.delivery_tracking 
FOR SELECT 
USING (auth.uid() = courier_id);

-- Add triggers for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for real-time updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_tracking REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER publication supabase_realtime ADD TABLE public.orders;
ALTER publication supabase_realtime ADD TABLE public.delivery_tracking;
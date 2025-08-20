-- Add RLS policies for restaurant and courier access

-- Policy for restaurants to view orders from their restaurant
CREATE POLICY "Restaurant owners can view their orders" 
ON public.orders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.restaurants 
  WHERE restaurants.id = orders.restaurant_id 
  AND restaurants.owner_id = auth.uid()
));

-- Policy for restaurants to update orders from their restaurant
CREATE POLICY "Restaurant owners can update their orders" 
ON public.orders 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.restaurants 
  WHERE restaurants.id = orders.restaurant_id 
  AND restaurants.owner_id = auth.uid()
));

-- Policy for couriers to view all available orders (not assigned yet)
CREATE POLICY "Couriers can view available orders" 
ON public.orders 
FOR SELECT 
USING (
  courier_id IS NULL 
  AND status IN ('confirmed', 'ready', 'preparing')
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'courier'::user_role
  )
);

-- Policy for couriers to accept orders (update courier_id)
CREATE POLICY "Couriers can accept orders" 
ON public.orders 
FOR UPDATE 
USING (
  courier_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'courier'::user_role
  )
)
WITH CHECK (
  courier_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'courier'::user_role
  )
);

-- Add function to get current user profile safely
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(user_id uuid, full_name text, role user_role)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT profiles.user_id, profiles.full_name, profiles.role 
  FROM public.profiles 
  WHERE profiles.user_id = auth.uid();
$$;
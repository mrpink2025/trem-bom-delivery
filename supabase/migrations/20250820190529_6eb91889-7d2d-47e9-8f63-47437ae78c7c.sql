-- Create a secure public view for restaurants data
CREATE OR REPLACE VIEW public.restaurants_public AS
SELECT 
  id,
  name,
  description,
  cuisine_type,
  image_url,
  rating,
  delivery_time_min,
  delivery_time_max,
  delivery_fee,
  minimum_order,
  is_active,
  is_open,
  address
FROM public.restaurants
WHERE is_active = true;

-- Grant access to the public view
GRANT SELECT ON public.restaurants_public TO anon;
GRANT SELECT ON public.restaurants_public TO authenticated;

-- Create RLS policy for the public view
ALTER TABLE public.restaurants_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public restaurants are viewable by everyone" 
ON public.restaurants_public 
FOR SELECT 
USING (true);

-- Update the original restaurants table RLS to be more restrictive for admin operations
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON public.restaurants;

CREATE POLICY "Admin and restaurant owners can view all restaurants" 
ON public.restaurants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (role = 'admin' OR (role = 'restaurant' AND restaurants.owner_id = auth.uid()))
  )
);
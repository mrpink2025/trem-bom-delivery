-- Add delivery scheduling and multiple stores features
-- Add delivery scheduling to orders
ALTER TABLE public.orders 
ADD COLUMN delivery_slot_start timestamp with time zone,
ADD COLUMN delivery_slot_end timestamp with time zone,
ADD COLUMN scheduled_for timestamp with time zone;

-- Add store units and capacity management
CREATE TABLE public.store_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  address jsonb NOT NULL,
  geo_point point NOT NULL,
  working_hours jsonb NOT NULL DEFAULT '{}',
  max_orders_per_hour integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add delivery slots management
CREATE TABLE public.delivery_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_unit_id uuid NOT NULL,
  slot_start timestamp with time zone NOT NULL,
  slot_end timestamp with time zone NOT NULL,
  max_capacity integer NOT NULL DEFAULT 5,
  current_orders integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add reviews system
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  target_type text NOT NULL, -- 'restaurant', 'courier', 'product'
  target_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add cart persistence
CREATE TABLE public.saved_carts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cart_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  notification_sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

-- Store units policies
CREATE POLICY "Anyone can view active store units" 
ON public.store_units FOR SELECT 
USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their store units" 
ON public.store_units FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.restaurants r 
  WHERE r.id = store_units.restaurant_id AND r.owner_id = auth.uid()
));

-- Delivery slots policies
CREATE POLICY "Anyone can view available delivery slots" 
ON public.delivery_slots FOR SELECT 
USING (is_available = true);

CREATE POLICY "Store managers can manage delivery slots" 
ON public.delivery_slots FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.store_units su
  JOIN public.restaurants r ON r.id = su.restaurant_id
  WHERE su.id = delivery_slots.store_unit_id AND r.owner_id = auth.uid()
));

-- Reviews policies
CREATE POLICY "Users can create reviews for their orders" 
ON public.reviews FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid() AND status = 'delivered')
);

CREATE POLICY "Anyone can view reviews" 
ON public.reviews FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews FOR UPDATE 
USING (auth.uid() = user_id);

-- Saved carts policies
CREATE POLICY "Users can manage their own saved carts" 
ON public.saved_carts FOR ALL 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_store_units_updated_at
  BEFORE UPDATE ON public.store_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_carts_updated_at
  BEFORE UPDATE ON public.saved_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get nearest store unit
CREATE OR REPLACE FUNCTION public.get_nearest_store_unit(
  restaurant_id_param uuid,
  user_lat numeric,
  user_lng numeric
)
RETURNS TABLE(
  store_id uuid,
  distance_km numeric,
  estimated_time_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.id,
    (point(user_lng, user_lat) <-> su.geo_point) * 111.32 as distance_km,
    CEIL((point(user_lng, user_lat) <-> su.geo_point) * 111.32 / 25.0 * 60) + 10 as estimated_time_minutes
  FROM public.store_units su
  WHERE su.restaurant_id = restaurant_id_param 
    AND su.is_active = true
  ORDER BY distance_km
  LIMIT 1;
END;
$$;

-- Function to update review averages
CREATE OR REPLACE FUNCTION public.update_review_averages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update restaurant rating
  IF NEW.target_type = 'restaurant' THEN
    UPDATE public.restaurants 
    SET rating = (
      SELECT AVG(stars)::numeric(3,2) 
      FROM public.reviews 
      WHERE target_type = 'restaurant' AND target_id = NEW.target_id
    )
    WHERE id = NEW.target_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for review averages
CREATE TRIGGER update_review_averages_trigger
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_averages();
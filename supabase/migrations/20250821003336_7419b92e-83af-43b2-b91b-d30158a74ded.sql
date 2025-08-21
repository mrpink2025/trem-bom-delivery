-- Fix security warnings for function search paths
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
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.update_review_averages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
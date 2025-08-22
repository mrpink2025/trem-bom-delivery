-- Fix the search_restaurants_by_city function to handle correct data types
DROP FUNCTION IF EXISTS search_restaurants_by_city(double precision, double precision, double precision, integer, boolean, text, text);

CREATE OR REPLACE FUNCTION search_restaurants_by_city(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 5,
  limit_count integer DEFAULT 50,
  open_only boolean DEFAULT true,
  search_query text DEFAULT '',
  target_city text DEFAULT 'any'
)
RETURNS TABLE(
  id text,
  name text,
  description text,
  cuisine_type text,
  image_url text,
  rating double precision,
  delivery_fee double precision,
  delivery_time_min integer,
  delivery_time_max integer,
  is_open boolean,
  address jsonb,  -- Changed from text to jsonb
  distance_km double precision,
  city text,
  state text,
  latitude double precision,
  longitude double precision,
  score double precision,
  is_active boolean,
  search_expanded boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description,
    r.cuisine_type,
    r.image_url,
    COALESCE(r.rating, 0.0)::double precision as rating,
    COALESCE(r.delivery_fee, 0.0)::double precision as delivery_fee,
    r.delivery_time_min,
    r.delivery_time_max,
    r.is_open,
    r.address,  -- This is jsonb in the table
    (6371 * acos(cos(radians(user_lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(r.latitude))))::double precision as distance_km,
    r.city,
    r.state,
    r.latitude,
    r.longitude,
    COALESCE(r.rating, 0.0)::double precision as score,
    COALESCE(r.is_open, false) as is_active,
    false as search_expanded  -- Not expanded search by default
  FROM restaurants r
  WHERE 
    (NOT open_only OR r.is_open = true)
    AND (search_query = '' OR (
      r.name ILIKE '%' || search_query || '%' OR 
      r.description ILIKE '%' || search_query || '%' OR 
      r.cuisine_type ILIKE '%' || search_query || '%'
    ))
    AND (target_city = 'any' OR r.city ILIKE '%' || target_city || '%')
    AND (6371 * acos(cos(radians(user_lat)) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(r.latitude)))) <= radius_km
  ORDER BY distance_km
  LIMIT limit_count;
END;
$$;
-- Fix the ambiguous column reference issue in search_restaurants_by_city function
CREATE OR REPLACE FUNCTION search_restaurants_by_city(
  center_lat double precision,
  center_lng double precision,
  search_radius_km double precision,
  search_limit integer DEFAULT 50,
  open_only boolean DEFAULT true,
  filter_category text DEFAULT NULL,
  client_city_name text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  name text,
  description text,
  cuisine_type text,
  image_url text,
  rating numeric,
  delivery_fee numeric,
  delivery_time_min integer,
  delivery_time_max integer,
  is_open boolean,
  distance_km double precision,
  score double precision,
  is_active boolean,
  search_expanded boolean
) AS $$
DECLARE
  nearby_count integer;
  expanded_count integer;
BEGIN
  -- First, get nearby restaurants within radius
  CREATE TEMP TABLE temp_nearby AS
  SELECT 
    r.id::text,
    r.name,
    r.description,
    r.cuisine_type,
    r.image_url,
    COALESCE(r.rating, 4.0) as rating,
    COALESCE(r.delivery_fee, 5.0) as delivery_fee,
    COALESCE(r.delivery_time_min, 30) as delivery_time_min,
    COALESCE(r.delivery_time_max, 45) as delivery_time_max,
    COALESCE(r.is_open, true) as is_open,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)::geography
    ) / 1000.0 as distance_km,
    (COALESCE(r.rating, 4.0) * 2 + 
     CASE WHEN r.is_open THEN 3 ELSE 0 END + 
     CASE WHEN ST_Distance(
       ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
       ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)::geography
     ) / 1000.0 < 2 THEN 2 ELSE 0 END) as score,
    COALESCE(r.is_active, true) as is_active,
    false as search_expanded
  FROM restaurants r
  WHERE r.is_active = true
    AND (NOT open_only OR r.is_open = true)
    AND (filter_category IS NULL OR r.cuisine_type ILIKE '%' || filter_category || '%')
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)::geography,
      search_radius_km * 1000
    );

  -- Count nearby restaurants
  SELECT COUNT(*) INTO nearby_count FROM temp_nearby;

  -- If we have fewer than 5 nearby restaurants, expand search to city/state
  IF nearby_count < 5 AND client_city_name IS NOT NULL THEN
    INSERT INTO temp_nearby
    SELECT 
      r.id::text,
      r.name,
      r.description,
      r.cuisine_type,
      r.image_url,
      COALESCE(r.rating, 4.0) as rating,
      COALESCE(r.delivery_fee, 5.0) as delivery_fee,
      COALESCE(r.delivery_time_min, 30) as delivery_time_min,
      COALESCE(r.delivery_time_max, 45) as delivery_time_max,
      COALESCE(r.is_open, true) as is_open,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)::geography
      ) / 1000.0 as distance_km,
      (COALESCE(r.rating, 4.0) * 2 + 
       CASE WHEN r.is_open THEN 3 ELSE 0 END) as score,
      COALESCE(r.is_active, true) as is_active,
      true as search_expanded
    FROM restaurants r
    WHERE r.is_active = true
      AND (NOT open_only OR r.is_open = true)
      AND (filter_category IS NULL OR r.cuisine_type ILIKE '%' || filter_category || '%')
      AND (r.city ILIKE '%' || client_city_name || '%' OR r.state ILIKE '%' || client_city_name || '%')
      AND r.id::text NOT IN (SELECT temp_nearby.id FROM temp_nearby)
    LIMIT search_limit;
  END IF;

  -- Return results ordered by score
  RETURN QUERY
  SELECT * FROM temp_nearby
  ORDER BY temp_nearby.score DESC, temp_nearby.distance_km ASC
  LIMIT search_limit;

  -- Clean up
  DROP TABLE temp_nearby;
END;
$$ LANGUAGE plpgsql;
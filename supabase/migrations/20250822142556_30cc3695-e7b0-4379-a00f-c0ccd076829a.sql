-- Criar função melhorada para buscar restaurantes priorizando a mesma cidade
CREATE OR REPLACE FUNCTION public.search_restaurants_by_city(
  lat_param DOUBLE PRECISION, 
  lng_param DOUBLE PRECISION, 
  radius_km_param INTEGER DEFAULT 5,
  limit_param INTEGER DEFAULT 50,
  only_open_param BOOLEAN DEFAULT true,
  client_city_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  cuisine_type TEXT,
  image_url TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  is_active BOOLEAN,
  score NUMERIC,
  opening_hours JSONB,
  distance_km NUMERIC,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  in_same_city BOOLEAN
)
SECURITY DEFINER
SET search_path = public
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
    r.city,
    r.state,
    r.neighborhood,
    r.is_active,
    r.score,
    r.opening_hours,
    ROUND(
      (
        6371 * acos(
          cos(radians(lat_param)) * 
          cos(radians(r.latitude)) * 
          cos(radians(r.longitude) - radians(lng_param)) + 
          sin(radians(lat_param)) * 
          sin(radians(r.latitude))
        )
      )::numeric, 2
    ) as distance_km,
    r.latitude,
    r.longitude,
    -- Marca se o restaurante está na mesma cidade do cliente
    CASE 
      WHEN client_city_param IS NOT NULL AND r.city IS NOT NULL THEN
        lower(trim(r.city)) = lower(trim(client_city_param))
      ELSE FALSE
    END as in_same_city
  FROM restaurants r
  WHERE r.is_active = true
    AND r.latitude IS NOT NULL 
    AND r.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(lat_param)) * 
        cos(radians(r.latitude)) * 
        cos(radians(r.longitude) - radians(lng_param)) + 
        sin(radians(lat_param)) * 
        sin(radians(r.latitude))
      )
    ) <= radius_km_param
    AND (NOT only_open_param OR 
         r.opening_hours IS NULL OR 
         jsonb_typeof(r.opening_hours) = 'null' OR
         r.is_active = true)
  ORDER BY 
    -- Priorizar restaurantes da mesma cidade
    CASE 
      WHEN client_city_param IS NOT NULL AND r.city IS NOT NULL AND 
           lower(trim(r.city)) = lower(trim(client_city_param)) THEN 0
      ELSE 1
    END,
    distance_km ASC, 
    r.score DESC NULLS LAST
  LIMIT limit_param;
END;
$$;
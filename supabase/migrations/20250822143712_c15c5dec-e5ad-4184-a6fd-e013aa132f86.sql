-- Remover função antiga e criar nova versão com busca expandida
DROP FUNCTION IF EXISTS public.search_restaurants_by_city(double precision,double precision,integer,integer,boolean,text);

-- Criar nova função com busca expandida para cidade/estado
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
  in_same_city BOOLEAN,
  search_expanded BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  nearby_count INTEGER;
BEGIN
  -- 🎯 STEP 1: Buscar restaurantes próximos normalmente
  CREATE TEMP TABLE nearby_results AS
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
    CASE 
      WHEN client_city_param IS NOT NULL AND r.city IS NOT NULL THEN
        lower(trim(r.city)) = lower(trim(client_city_param))
      ELSE FALSE
    END as in_same_city,
    FALSE as search_expanded
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
         r.is_active = true);

  -- 🎯 STEP 2: Verificar se temos resultados suficientes
  SELECT COUNT(*) INTO nearby_count FROM nearby_results;
  
  -- Se temos menos de 5 resultados e sabemos a cidade, expandir busca
  IF nearby_count < 5 AND client_city_param IS NOT NULL THEN
    -- Adicionar restaurantes da mesma cidade que não estão no raio
    INSERT INTO nearby_results
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
      true as in_same_city,
      true as search_expanded
    FROM restaurants r
    WHERE r.is_active = true
      AND r.latitude IS NOT NULL 
      AND r.longitude IS NOT NULL
      AND lower(trim(r.city)) = lower(trim(client_city_param))
      AND r.id NOT IN (SELECT id FROM nearby_results)
      AND (NOT only_open_param OR 
           r.opening_hours IS NULL OR 
           jsonb_typeof(r.opening_hours) = 'null' OR
           r.is_active = true)
    LIMIT (limit_param - nearby_count);
  END IF;

  -- 🎯 STEP 3: Retornar resultados ordenados
  RETURN QUERY
  SELECT * FROM nearby_results
  ORDER BY 
    -- Priorizar restaurantes próximos da mesma cidade
    CASE WHEN in_same_city AND NOT search_expanded THEN 0 ELSE 1 END,
    -- Depois outros próximos
    CASE WHEN NOT search_expanded THEN 0 ELSE 1 END,
    -- Por último, expandidos da cidade
    distance_km ASC, 
    score DESC NULLS LAST
  LIMIT limit_param;

  -- Limpar tabela temporária
  DROP TABLE nearby_results;
END;
$$;
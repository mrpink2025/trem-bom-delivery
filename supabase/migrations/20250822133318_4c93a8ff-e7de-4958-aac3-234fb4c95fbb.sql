-- Criar funções auxiliares para busca de restaurantes (com verificação de extensões)

-- Função para verificar extensões disponíveis
CREATE OR REPLACE FUNCTION get_extensions()
RETURNS TABLE(name text)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT extname::text as name FROM pg_extension;
$$;

-- Função para busca com PostGIS (apenas se PostGIS estiver disponível)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION search_restaurants_postgis(
      lat_param DOUBLE PRECISION,
      lng_param DOUBLE PRECISION,
      radius_km_param DOUBLE PRECISION,
      limit_param INTEGER,
      only_open_param BOOLEAN
    )
    RETURNS TABLE(
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
      longitude DOUBLE PRECISION
    )
    LANGUAGE SQL
    SECURITY DEFINER
    SET search_path = public
    AS $func$
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
          (ST_Distance(
            r.location, 
            ST_MakePoint(lng_param, lat_param)::geography
          ) / 1000)::numeric, 2
        ) as distance_km,
        r.latitude,
        r.longitude
      FROM restaurants r
      WHERE r.is_active = true
        AND r.latitude IS NOT NULL 
        AND r.longitude IS NOT NULL
        AND r.location IS NOT NULL
        AND ST_DWithin(
          r.location, 
          ST_MakePoint(lng_param, lat_param)::geography, 
          radius_km_param * 1000
        )
        AND (NOT only_open_param OR 
             r.opening_hours IS NULL OR 
             jsonb_typeof(r.opening_hours) = ''null'' OR
             r.is_active = true)
      ORDER BY distance_km ASC, r.score DESC NULLS LAST
      LIMIT limit_param;
    $func$;';
  END IF;
END
$$;

-- Função para busca com earthdistance (apenas se earthdistance estiver disponível)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'earthdistance') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION search_restaurants_earthdistance(
      lat_param DOUBLE PRECISION,
      lng_param DOUBLE PRECISION,
      radius_km_param DOUBLE PRECISION,
      limit_param INTEGER,
      only_open_param BOOLEAN
    )
    RETURNS TABLE(
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
      longitude DOUBLE PRECISION
    )
    LANGUAGE SQL
    SECURITY DEFINER
    SET search_path = public
    AS $func$
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
          (earth_distance(
            ll_to_earth(lat_param, lng_param), 
            ll_to_earth(r.latitude, r.longitude)
          ) / 1000)::numeric, 2
        ) as distance_km,
        r.latitude,
        r.longitude
      FROM restaurants r
      WHERE r.is_active = true
        AND r.latitude IS NOT NULL 
        AND r.longitude IS NOT NULL
        AND earth_distance(
          ll_to_earth(lat_param, lng_param), 
          ll_to_earth(r.latitude, r.longitude)
        ) <= (radius_km_param * 1000)
        AND (NOT only_open_param OR 
             r.opening_hours IS NULL OR 
             jsonb_typeof(r.opening_hours) = ''null'' OR
             r.is_active = true)
      ORDER BY distance_km ASC, r.score DESC NULLS LAST
      LIMIT limit_param;
    $func$;';
  END IF;
END
$$;

-- Função básica usando cálculo simples de distância (sempre disponível como fallback)
CREATE OR REPLACE FUNCTION search_restaurants_basic(
  lat_param DOUBLE PRECISION,
  lng_param DOUBLE PRECISION,
  radius_km_param DOUBLE PRECISION,
  limit_param INTEGER,
  only_open_param BOOLEAN
)
RETURNS TABLE(
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
  longitude DOUBLE PRECISION
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
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
    r.longitude
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
  ORDER BY distance_km ASC, r.score DESC NULLS LAST
  LIMIT limit_param;
$$;

-- Função auxiliar para verificar se restaurante está aberto
CREATE OR REPLACE FUNCTION is_restaurant_open(opening_hours JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_day TEXT;
  current_time TIME;
  day_hours TEXT[];
  time_range TEXT;
  start_time TIME;
  end_time TIME;
BEGIN
  -- Se não há horários definidos, assumir que está aberto
  IF opening_hours IS NULL OR jsonb_typeof(opening_hours) = 'null' THEN
    RETURN TRUE;
  END IF;

  -- Obter dia da semana atual (em inglês, minúsculo)
  current_day := CASE EXTRACT(DOW FROM NOW())
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  current_time := NOW()::TIME;

  -- Verificar se há horários para o dia atual
  IF NOT (opening_hours ? current_day) THEN
    RETURN FALSE;
  END IF;

  -- Obter horários do dia
  day_hours := string_to_array(opening_hours ->> current_day, ',');

  -- Verificar cada intervalo de horário
  FOREACH time_range IN ARRAY day_hours
  LOOP
    start_time := split_part(time_range, '-', 1)::TIME;
    end_time := split_part(time_range, '-', 2)::TIME;
    
    IF current_time BETWEEN start_time AND end_time THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN TRUE; -- Em caso de erro, assumir aberto
END;
$$;
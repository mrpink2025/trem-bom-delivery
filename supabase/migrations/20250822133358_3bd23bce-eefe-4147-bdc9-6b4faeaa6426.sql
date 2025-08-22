-- Criar funções auxiliares para busca de restaurantes (corrigido)

-- Função para verificar extensões disponíveis
CREATE OR REPLACE FUNCTION get_extensions()
RETURNS TABLE(name text)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT extname::text as name FROM pg_extension;
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

-- Função auxiliar para verificar se restaurante está aberto (simplificada)
CREATE OR REPLACE FUNCTION is_restaurant_open(opening_hours JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  day_key TEXT;
  current_hour INTEGER;
BEGIN
  -- Se não há horários definidos, assumir que está aberto
  IF opening_hours IS NULL OR jsonb_typeof(opening_hours) = 'null' THEN
    RETURN TRUE;
  END IF;

  -- Obter dia da semana atual
  day_key := CASE EXTRACT(DOW FROM NOW())
    WHEN 0 THEN 'sunday'
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
  END;

  current_hour := EXTRACT(HOUR FROM NOW());

  -- Verificar se há horários para o dia atual
  IF NOT (opening_hours ? day_key) THEN
    RETURN FALSE;
  END IF;

  -- Por simplicidade, assumir que se tem horário definido para o dia, está aberto
  -- (lógica mais complexa de parsing de horários pode ser implementada depois)
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN TRUE; -- Em caso de erro, assumir aberto
END;
$$;
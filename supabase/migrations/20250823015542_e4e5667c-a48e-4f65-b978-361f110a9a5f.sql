-- Criar função edge para obter token do Mapbox
CREATE OR REPLACE FUNCTION get_mapbox_token()
RETURNS TABLE(token text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta função será implementada como Edge Function
  -- Por agora, retorna null para evitar erros
  RETURN QUERY SELECT null::text as token;
END;
$$;
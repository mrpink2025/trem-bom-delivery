-- Corrigir questões de segurança identificadas pelo linter

-- 1. Habilitar RLS na tabela restaurants
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura de restaurantes ativos
CREATE POLICY "Anyone can view active restaurants" ON restaurants
    FOR SELECT USING (is_active = true);

-- Permitir que donos de restaurantes gerenciem seus próprios dados
CREATE POLICY "Restaurant owners can manage their restaurants" ON restaurants
    FOR ALL USING (owner_id = auth.uid());

-- 2. Corrigir search_path das funções existentes
CREATE OR REPLACE FUNCTION update_restaurant_location()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se PostGIS está disponível e temos lat/lng, atualizar location
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
       AND NEW.latitude IS NOT NULL 
       AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_locations_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
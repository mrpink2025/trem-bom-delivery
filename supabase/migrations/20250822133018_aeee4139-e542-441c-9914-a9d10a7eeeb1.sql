-- Corrigir questões de segurança (verificando se já existe)

-- 1. Habilitar RLS na tabela restaurants se não estiver habilitada
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'restaurants') THEN
        ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Criar políticas apenas se não existirem
DO $$
BEGIN
    -- Política para visualizar restaurantes ativos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Anyone can view active restaurants') THEN
        EXECUTE 'CREATE POLICY "Anyone can view active restaurants" ON restaurants FOR SELECT USING (is_active = true)';
    END IF;
    
    -- Política para donos gerenciarem seus restaurantes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Restaurant owners can manage their restaurants') THEN
        EXECUTE 'CREATE POLICY "Restaurant owners can manage their restaurants" ON restaurants FOR ALL USING (owner_id = auth.uid())';
    END IF;
END
$$;

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
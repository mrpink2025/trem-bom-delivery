-- Adicionar extensões geoespaciais
CREATE EXTENSION IF NOT EXISTS postgis;

-- Fallback se PostGIS não estiver disponível
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        CREATE EXTENSION IF NOT EXISTS cube;
        CREATE EXTENSION IF NOT EXISTS earthdistance;
    END IF;
END
$$;

-- Adicionar colunas de localização na tabela restaurants se não existirem
DO $$
BEGIN
    -- Adicionar latitude se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'latitude') THEN
        ALTER TABLE restaurants ADD COLUMN latitude DOUBLE PRECISION;
    END IF;
    
    -- Adicionar longitude se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'longitude') THEN
        ALTER TABLE restaurants ADD COLUMN longitude DOUBLE PRECISION;
    END IF;
    
    -- Adicionar colunas adicionais de localização
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'city') THEN
        ALTER TABLE restaurants ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'state') THEN
        ALTER TABLE restaurants ADD COLUMN state TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'neighborhood') THEN
        ALTER TABLE restaurants ADD COLUMN neighborhood TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'opening_hours') THEN
        ALTER TABLE restaurants ADD COLUMN opening_hours JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'score') THEN
        ALTER TABLE restaurants ADD COLUMN score NUMERIC(3,2) DEFAULT 0;
    END IF;
END
$$;

-- Adicionar coluna PostGIS location se PostGIS estiver disponível
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'location') THEN
            ALTER TABLE restaurants ADD COLUMN location GEOGRAPHY(Point,4326);
        END IF;
    END IF;
END
$$;

-- Criar índices apropriados
DO $$
BEGIN
    -- Se PostGIS está disponível, criar índice GIST
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_restaurants_location') THEN
            CREATE INDEX idx_restaurants_location ON restaurants USING GIST (location);
        END IF;
    ELSE
        -- Fallback: índice para lat/lng
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_restaurants_lat_lng') THEN
            CREATE INDEX idx_restaurants_lat_lng ON restaurants(latitude, longitude);
        END IF;
    END IF;
END
$$;

-- Função para atualizar location com base em latitude/longitude
CREATE OR REPLACE FUNCTION update_restaurant_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Se PostGIS está disponível e temos lat/lng, atualizar location
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
       AND NEW.latitude IS NOT NULL 
       AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_MakePoint(NEW.longitude, NEW.latitude)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar location automaticamente
DROP TRIGGER IF EXISTS update_restaurant_location_trigger ON restaurants;
CREATE TRIGGER update_restaurant_location_trigger
    BEFORE INSERT OR UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_restaurant_location();

-- Inserir dados de exemplo se a tabela estiver vazia
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1) THEN
        INSERT INTO restaurants (id, name, description, cuisine_type, image_url, is_active, latitude, longitude, city, state, neighborhood, score, opening_hours) VALUES
        (gen_random_uuid(), 'Pamonharia Central', 'A melhor pamonha de Goiânia', 'Brasileira', '/pamonharia-central-logo.jpg', true, -16.6869, -49.2648, 'Goiânia', 'GO', 'Centro', 4.5, '{"monday": "06:00-22:00", "tuesday": "06:00-22:00", "wednesday": "06:00-22:00", "thursday": "06:00-22:00", "friday": "06:00-23:00", "saturday": "06:00-23:00", "sunday": "07:00-21:00"}'),
        (gen_random_uuid(), 'Tempero Goiano', 'Comida caseira tradicional', 'Goiana', '/tempero-goiano-logo.jpg', true, -16.6809, -49.2567, 'Goiânia', 'GO', 'Setor Oeste', 4.3, '{"monday": "11:00-14:30,18:00-22:00", "tuesday": "11:00-14:30,18:00-22:00", "wednesday": "11:00-14:30,18:00-22:00", "thursday": "11:00-14:30,18:00-22:00", "friday": "11:00-14:30,18:00-23:00", "saturday": "11:00-15:00,18:00-23:00", "sunday": "11:00-15:00"}'),
        (gen_random_uuid(), 'Pizzaria Trem Bão', 'As melhores pizzas da região', 'Italiana', '/restaurant-pizza.jpg', true, -16.6736, -49.2544, 'Goiânia', 'GO', 'Setor Bueno', 4.7, '{"monday": "18:00-23:30", "tuesday": "18:00-23:30", "wednesday": "18:00-23:30", "thursday": "18:00-23:30", "friday": "18:00-00:30", "saturday": "18:00-00:30", "sunday": "18:00-23:00"}'),
        (gen_random_uuid(), 'Burguer Mineiro', 'Hambúrgueres artesanais', 'Hamburgueria', '/restaurant-burger.jpg', true, -16.6799, -49.2598, 'Goiânia', 'GO', 'Setor Central', 4.2, '{"monday": "17:00-23:00", "tuesday": "17:00-23:00", "wednesday": "17:00-23:00", "thursday": "17:00-23:00", "friday": "17:00-00:00", "saturday": "17:00-00:00", "sunday": "17:00-22:00"}'),
        (gen_random_uuid(), 'Pastelaria do Seu João', 'Pastéis fresquinhos e sucos', 'Pastelaria', '/restaurant-pastel.jpg', true, -16.6889, -49.2667, 'Goiânia', 'GO', 'Campinas', 4.0, '{"monday": "07:00-18:00", "tuesday": "07:00-18:00", "wednesday": "07:00-18:00", "thursday": "07:00-18:00", "friday": "07:00-19:00", "saturday": "07:00-19:00", "sunday": "08:00-17:00"}');
    END IF;
END
$$;

-- Tabela para armazenar localizações dos usuários (com consentimento LGPD)
CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy_km NUMERIC(10,3),
    source TEXT NOT NULL CHECK (source IN ('gps', 'ip', 'manual', 'approx')),
    city TEXT,
    state TEXT,
    neighborhood TEXT,
    address_text TEXT,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para user_locations
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own locations" ON user_locations
    FOR ALL USING (auth.uid() = user_id);

-- Índice para user_locations
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_locations_updated_at_trigger ON user_locations;
CREATE TRIGGER update_user_locations_updated_at_trigger
    BEFORE UPDATE ON user_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_locations_updated_at();
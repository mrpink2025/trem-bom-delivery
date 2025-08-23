-- Criar tipos necessários (verificar se já existem)
DO $$ 
BEGIN
    -- Criar enum zone_shape se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zone_shape') THEN
        CREATE TYPE zone_shape AS ENUM ('RADIUS','POLYGON');
    END IF;
    
    -- Criar enum option_group_type se não existir  
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'option_group_type') THEN
        CREATE TYPE option_group_type AS ENUM ('SINGLE','MULTI');
    END IF;
END$$;
-- Verificar e adicionar colunas faltantes em menu_items
DO $$ 
BEGIN
    -- Adicionar colunas faltantes se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='base_price') THEN
        ALTER TABLE menu_items ADD COLUMN base_price numeric(10,2);
        UPDATE menu_items SET base_price = price WHERE base_price IS NULL;
        ALTER TABLE menu_items ALTER COLUMN base_price SET NOT NULL;
        ALTER TABLE menu_items ADD CONSTRAINT check_base_price_positive CHECK (base_price >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='sku') THEN
        ALTER TABLE menu_items ADD COLUMN sku text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='cost_price') THEN
        ALTER TABLE menu_items ADD COLUMN cost_price numeric(10,2) CHECK (cost_price >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='barcode') THEN
        ALTER TABLE menu_items ADD COLUMN barcode text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='tags') THEN
        ALTER TABLE menu_items ADD COLUMN tags text[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='track_stock') THEN
        ALTER TABLE menu_items ADD COLUMN track_stock boolean NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='stock') THEN
        ALTER TABLE menu_items ADD COLUMN stock int DEFAULT 0 CHECK (stock >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='min_qty') THEN
        ALTER TABLE menu_items ADD COLUMN min_qty int DEFAULT 1 CHECK (min_qty >= 1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='max_qty') THEN
        ALTER TABLE menu_items ADD COLUMN max_qty int CHECK (max_qty >= min_qty);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='schedule_json') THEN
        ALTER TABLE menu_items ADD COLUMN schedule_json jsonb;
    END IF;
END$$;

-- Renomear coluna se necessário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='menu_items' AND column_name='is_available') THEN
        ALTER TABLE menu_items RENAME COLUMN is_available TO is_active;
    END IF;
EXCEPTION WHEN duplicate_column THEN
    -- Coluna já existe com o nome correto
END$$;
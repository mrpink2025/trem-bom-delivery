-- Remover tabelas se existirem
DROP TABLE IF EXISTS menu_item_variants;
DROP TABLE IF EXISTS menu_item_options; 
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menu_categories;

-- Categorias do menu
CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id);
CREATE INDEX idx_menu_categories_sort ON menu_categories(restaurant_id, sort_order) WHERE is_active = true;

-- Itens/Produtos do menu
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  base_price numeric(10,2) NOT NULL CHECK (base_price >= 0),
  photo_url text,
  sku text,
  cost_price numeric(10,2) CHECK (cost_price >= 0),
  barcode text,
  allergens text[],
  tags text[],
  is_active boolean NOT NULL DEFAULT true,
  track_stock boolean NOT NULL DEFAULT false,
  stock int DEFAULT 0 CHECK (stock >= 0),
  min_qty int DEFAULT 1 CHECK (min_qty >= 1),
  max_qty int CHECK (max_qty >= min_qty),
  schedule_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Índices para menu_items
CREATE INDEX idx_menu_items_restaurant_active ON menu_items(restaurant_id, is_active);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_sku ON menu_items(restaurant_id, sku) WHERE sku IS NOT NULL;
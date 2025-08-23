-- Tabelas do sistema de catálogo com RLS habilitado

-- Categorias do menu
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_menu_categories_merchant ON menu_categories(merchant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort ON menu_categories(merchant_id, sort_order) WHERE is_active = true;

-- Itens/Produtos do menu
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_menu_items_merchant_active ON menu_items(merchant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sku ON menu_items(merchant_id, sku) WHERE sku IS NOT NULL;

-- Variantes de itens (tamanho/sabor/etc)
CREATE TABLE IF NOT EXISTS menu_item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  delta_price numeric(10,2) NOT NULL DEFAULT 0,
  sku text,
  track_stock boolean NOT NULL DEFAULT false,
  stock int DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_item_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON menu_item_variants(item_id, sort_order);

-- Grupos de Modificadores/Opcionais
CREATE TABLE IF NOT EXISTS menu_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  name text NOT NULL,
  type option_group_type NOT NULL DEFAULT 'MULTI',
  required boolean NOT NULL DEFAULT false,
  min_select int DEFAULT 0 CHECK (min_select >= 0),
  max_select int CHECK (max_select >= min_select),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_item_options ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_menu_item_options_merchant ON menu_item_options(merchant_id);
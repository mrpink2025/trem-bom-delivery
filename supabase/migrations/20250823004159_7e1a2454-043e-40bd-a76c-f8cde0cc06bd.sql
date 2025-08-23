-- Criação das tabelas do sistema de catálogo

-- Enum para tipos de zona de entrega
CREATE TYPE IF NOT EXISTS zone_shape AS ENUM ('RADIUS','POLYGON');

-- Enum para tipos de grupos de opções
CREATE TYPE IF NOT EXISTS option_group_type AS ENUM ('SINGLE','MULTI');

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
  allergens text[],                -- ['GLUTEN','LACTOSE','NUTS',...]
  tags text[],                     -- ['vegano','lowcarb','popular',...]
  is_active boolean NOT NULL DEFAULT true,
  track_stock boolean NOT NULL DEFAULT false,
  stock int DEFAULT 0 CHECK (stock >= 0),
  min_qty int DEFAULT 1 CHECK (min_qty >= 1),
  max_qty int CHECK (max_qty >= min_qty),
  schedule_json jsonb,             -- disponibilidade por dia/horário
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para menu_items
CREATE INDEX IF NOT EXISTS idx_menu_items_merchant_active ON menu_items(merchant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sku ON menu_items(merchant_id, sku) WHERE sku IS NOT NULL;

-- Variantes de itens (tamanho/sabor/etc)
CREATE TABLE IF NOT EXISTS menu_item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,              -- Ex.: 'P', 'M', 'G', 'Chocolate', 'Baunilha'
  delta_price numeric(10,2) NOT NULL DEFAULT 0,
  sku text,
  track_stock boolean NOT NULL DEFAULT false,
  stock int DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON menu_item_variants(item_id, sort_order);

-- Grupos de Modificadores/Opcionais
CREATE TABLE IF NOT EXISTS menu_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  name text NOT NULL,              -- Ex.: 'Adicionais', 'Ponto da carne', 'Bebidas'
  type option_group_type NOT NULL DEFAULT 'MULTI',
  required boolean NOT NULL DEFAULT false,
  min_select int DEFAULT 0 CHECK (min_select >= 0),
  max_select int CHECK (max_select >= min_select),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_item_options_merchant ON menu_item_options(merchant_id);

-- Valores dos grupos de opções
CREATE TABLE IF NOT EXISTS menu_item_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
  value text NOT NULL,             -- Ex.: 'Cheddar', 'Bacon', 'Sem cebola'
  delta_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_item_option_values_option ON menu_item_option_values(option_id, sort_order);

-- Associação item ↔ grupos de opções
CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (item_id, option_id)
);

-- Combos/Kits
CREATE TABLE IF NOT EXISTS menu_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  base_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_combos_merchant ON menu_combos(merchant_id);

-- Itens que compõem um combo
CREATE TABLE IF NOT EXISTS menu_combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES menu_combos(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES menu_items(id),
  min_select int DEFAULT 1 CHECK (min_select >= 0),
  max_select int DEFAULT 1 CHECK (max_select >= min_select),
  delta_price numeric(10,2) NOT NULL DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_combo_items_combo ON menu_combo_items(combo_id, sort_order);

-- Horários de disponibilidade detalhados (alternativa ao schedule_json)
CREATE TABLE IF NOT EXISTS menu_item_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  dow int NOT NULL CHECK (dow BETWEEN 0 AND 6), -- 0=Domingo ... 6=Sábado
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_item_schedules_item ON menu_item_schedules(item_id, dow);

-- Atualizar tabela delivery_zones se não existir
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  name text NOT NULL,
  shape zone_shape NOT NULL DEFAULT 'RADIUS',
  radius_km numeric(6,2) CHECK (radius_km > 0),
  polygon geography(Polygon,4326),
  center_lat numeric(10,7),
  center_lng numeric(10,7),
  fee_fixed numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (fee_fixed >= 0),
  fee_per_km numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (fee_per_km >= 0),
  min_order_value numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (min_order_value >= 0),
  max_order_value numeric(10,2) CHECK (max_order_value >= min_order_value),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_merchant ON delivery_zones(merchant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(merchant_id, is_active);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_item_options_updated_at BEFORE UPDATE ON menu_item_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_combos_updated_at BEFORE UPDATE ON menu_combos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delivery_zones_updated_at BEFORE UPDATE ON delivery_zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
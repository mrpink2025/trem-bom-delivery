-- Habilitar RLS na tabela menu_items existente
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Criar tabela de categorias se não existir (atualizada para trabalhar com categories existente)
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Variantes de itens
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

-- Grupos de Modificadores/Opcionais
CREATE TABLE IF NOT EXISTS menu_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
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
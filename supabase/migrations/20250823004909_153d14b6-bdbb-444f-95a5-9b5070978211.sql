-- Valores dos grupos de opções
CREATE TABLE IF NOT EXISTS menu_item_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
  value text NOT NULL,
  delta_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_item_option_values ENABLE ROW LEVEL SECURITY;

-- Associação item ↔ grupos de opções
CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES menu_item_options(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (item_id, option_id)
);

ALTER TABLE menu_item_option_groups ENABLE ROW LEVEL SECURITY;

-- Combos/Kits
CREATE TABLE IF NOT EXISTS menu_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_combos ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE menu_combo_items ENABLE ROW LEVEL SECURITY;

-- Storage bucket para fotos do menu
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-media', 'menu-media', false)
ON CONFLICT (id) DO NOTHING;
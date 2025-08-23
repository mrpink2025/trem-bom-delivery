-- Políticas RLS para menu_categories
CREATE POLICY "Restaurant owners can manage their categories" ON menu_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_categories.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active categories" ON menu_categories
  FOR SELECT USING (is_active = true);

-- Políticas RLS para menu_items
CREATE POLICY "Restaurant owners can manage their items" ON menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active menu items" ON menu_items
  FOR SELECT USING (
    is_active = true AND 
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_items.restaurant_id 
      AND restaurants.is_active = true
    )
  );

-- Políticas RLS para menu_item_variants
CREATE POLICY "Restaurant owners can manage item variants" ON menu_item_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      JOIN restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_variants.item_id 
      AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active variants" ON menu_item_variants
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM menu_items mi
      JOIN restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_variants.item_id 
      AND mi.is_active = true 
      AND r.is_active = true
    )
  );

-- Políticas RLS para menu_item_options
CREATE POLICY "Restaurant owners can manage their options" ON menu_item_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_item_options.restaurant_id 
      AND restaurants.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active options" ON menu_item_options
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM restaurants 
      WHERE restaurants.id = menu_item_options.restaurant_id 
      AND restaurants.is_active = true
    )
  );
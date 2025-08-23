-- Corrigir foreign key para apontar para menu_categories ao invés de categories
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS fk_menu_items_category;

-- Adicionar nova foreign key apontando para menu_categories
ALTER TABLE menu_items 
ADD CONSTRAINT fk_menu_items_category 
FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL;
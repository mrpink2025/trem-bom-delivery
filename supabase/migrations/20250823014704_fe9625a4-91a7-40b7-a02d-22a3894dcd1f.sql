-- Primeiro, vamos limpar os dados inconsistentes
-- Setar category_id como NULL para itens que apontam para categorias que não existem
UPDATE menu_items 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND category_id NOT IN (SELECT id FROM menu_categories);

-- Agora corrigir a foreign key para apontar para menu_categories
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS fk_menu_items_category;

-- Adicionar nova foreign key apontando para menu_categories
ALTER TABLE menu_items 
ADD CONSTRAINT fk_menu_items_category 
FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL;
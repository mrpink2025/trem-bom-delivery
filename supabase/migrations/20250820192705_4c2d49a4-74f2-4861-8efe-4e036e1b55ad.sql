-- Update restaurant image URLs to use placeholder images from Unsplash
UPDATE restaurants SET image_url = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop&q=80' WHERE cuisine_type = 'Lanches';
UPDATE restaurants SET image_url = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&q=80' WHERE cuisine_type = 'Pizzas';
UPDATE restaurants SET image_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80' WHERE cuisine_type = 'Comida Goiana';
UPDATE restaurants SET image_url = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80' WHERE cuisine_type = 'Comida Mineira';
UPDATE restaurants SET image_url = 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&q=80' WHERE cuisine_type = 'Pamonharia';
UPDATE restaurants SET image_url = 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop&q=80' WHERE cuisine_type = 'Pastéis';

-- Update menu items to use better placeholder images
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&q=80' WHERE name ILIKE '%burger%' OR name ILIKE '%hambúrguer%';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&q=80' WHERE name ILIKE '%pizza%';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80' WHERE name ILIKE '%goiano%' OR name ILIKE '%goiás%';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80' WHERE name ILIKE '%mineiro%' OR name ILIKE '%minas%';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&q=80' WHERE name ILIKE '%pamonha%';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop&q=80' WHERE name ILIKE '%pastel%';
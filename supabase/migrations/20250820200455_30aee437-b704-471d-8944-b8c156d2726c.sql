-- Corrigir imagem quebrada do Tempero Goiano
UPDATE menu_items 
SET image_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80'
WHERE image_url LIKE '/src/assets/%' OR image_url LIKE './src/assets/%';
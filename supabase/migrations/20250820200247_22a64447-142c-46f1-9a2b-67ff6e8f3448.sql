-- Adicionar imagens para as categorias que estão sem imagem
UPDATE categories 
SET image_url = CASE 
  WHEN name = 'Lanches' THEN 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&q=80'
  WHEN name = 'Pizzas' THEN 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&q=80'
  WHEN name = 'Comida Mineira' THEN 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80'
  WHEN name = 'Comida Goiana' THEN 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80'
  WHEN name = 'Pamonharia' THEN 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&q=80'
  WHEN name = 'Pastéis' THEN 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop&q=80'
  WHEN name = 'Bebidas' THEN 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop&q=80'
  WHEN name = 'Sobremesas' THEN 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop&q=80'
END
WHERE image_url IS NULL;
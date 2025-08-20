-- Atualizar menu items sem imagem
UPDATE menu_items 
SET image_url = CASE 
  WHEN name ILIKE '%refrigerante%' THEN 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%suco%' THEN 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%água%' THEN 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%cerveja%' THEN 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%hamburguer%' OR name ILIKE '%burger%' THEN 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%pizza%' THEN 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%pastel%' THEN 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%pamonha%' THEN 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%feijão%' OR name ILIKE '%tropeiro%' THEN 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%pão%' OR name ILIKE '%cheese%' THEN 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80'
  WHEN name ILIKE '%sobremesa%' OR name ILIKE '%doce%' THEN 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop&q=80'
  ELSE 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80'
END
WHERE image_url IS NULL OR image_url = '';

-- Adicionar novas categorias
INSERT INTO categories (id, name, description, image_url, is_active, display_order) VALUES
('b1a2c3d4-e5f6-7890-abcd-ef1234567890', 'Comida de Buteco', 'Petiscos e pratos típicos de boteco', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&q=80', true, 8),
('c2b3d4e5-f6a7-8901-bcde-f23456789012', 'Conveniência', 'Produtos de loja de conveniência', 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&h=300&fit=crop&q=80', true, 9);

-- Adicionar restaurantes de buteco
INSERT INTO restaurants (
  id, name, description, cuisine_type, image_url, phone, email, 
  address, delivery_fee, minimum_order, delivery_time_min, delivery_time_max,
  rating, is_active, is_open, owner_id
) VALUES 
(
  '00000001-0000-0000-0000-000000000001',
  'Boteco do Zé',
  'O melhor boteco da cidade com petiscos tradicionais e ambiente descontraído',
  'Comida de Buteco',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&q=80',
  '(62) 98765-4321',
  'contato@botecodozé.com.br',
  '{"street": "Rua das Flores, 123", "neighborhood": "Centro", "city": "Goiânia", "state": "GO", "zipCode": "74000-000", "latitude": -16.6799, "longitude": -49.2550}',
  8.50,
  25.00,
  25,
  45,
  4.6,
  true,
  true,
  null
),
(
  '00000002-0000-0000-0000-000000000002',
  'Bar do Chico',
  'Tradição em petiscos e chopp gelado há mais de 30 anos',
  'Comida de Buteco',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80',
  '(62) 97654-3210',
  'bardochico@email.com',
  '{"street": "Avenida Goiás, 456", "neighborhood": "Setor Central", "city": "Goiânia", "state": "GO", "zipCode": "74010-010", "latitude": -16.6799, "longitude": -49.2550}',
  7.00,
  20.00,
  20,
  40,
  4.4,
  true,
  true,
  null
);

-- Adicionar lojas de conveniência
INSERT INTO restaurants (
  id, name, description, cuisine_type, image_url, phone, email, 
  address, delivery_fee, minimum_order, delivery_time_min, delivery_time_max,
  rating, is_active, is_open, owner_id
) VALUES 
(
  '00000003-0000-0000-0000-000000000003',
  '24h Express',
  'Conveniência 24 horas com lanches rápidos e produtos essenciais',
  'Conveniência',
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400&h=300&fit=crop&q=80',
  '(62) 96543-2109',
  'contato@24hexpress.com.br',
  '{"street": "Rua T-3, 789", "neighborhood": "Setor Bueno", "city": "Goiânia", "state": "GO", "zipCode": "74210-030", "latitude": -16.6799, "longitude": -49.2550}',
  5.50,
  15.00,
  10,
  25,
  4.2,
  true,
  true,
  null
),
(
  '00000004-0000-0000-0000-000000000004',
  'Stop Conveniência',
  'Sua parada rápida para lanches, bebidas e produtos do dia a dia',
  'Conveniência',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&q=80',
  '(62) 95432-1098',
  'stop@conveniencia.com.br',
  '{"street": "Avenida T-4, 321", "neighborhood": "Setor Sul", "city": "Goiânia", "state": "GO", "zipCode": "74215-050", "latitude": -16.6799, "longitude": -49.2550}',
  6.00,
  12.00,
  8,
  20,
  4.3,
  true,
  true,
  null
);

-- Menu items para Boteco do Zé
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients, allergens
) VALUES
('00000001-0000-0000-0000-000000000001', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 
 'Torresmo Crocante', 'Torresmo sequinho e crocante acompanha vinagrete', 18.90, 
 'https://images.unsplash.com/photo-1606755962773-d324e9a13086?w=400&h=300&fit=crop&q=80', true, 15, 
 ARRAY['torresmo', 'vinagrete', 'cebola', 'tomate'], ARRAY[]::text[]),

('00000001-0000-0000-0000-000000000001', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 
 'Caldinho de Feijão', 'Caldo de feijão temperado com bacon e calabresa', 12.50, 
 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&q=80', true, 20, 
 ARRAY['feijão', 'bacon', 'calabresa', 'temperos'], ARRAY[]::text[]),

('00000001-0000-0000-0000-000000000001', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 
 'Pastel de Queijo', 'Pastel frito na hora recheado com queijo derretido', 8.00, 
 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop&q=80', true, 10, 
 ARRAY['massa', 'queijo mussarela'], ARRAY['glúten', 'lactose']),

('00000001-0000-0000-0000-000000000001', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Chopp Pilsen 300ml', 'Chopp gelado tirado na hora', 8.50, 
 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop&q=80', true, 2, 
 ARRAY['malte', 'lúpulo', 'água'], ARRAY['glúten']),

('00000001-0000-0000-0000-000000000001', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Caipirinha', 'Cachaça, limão, açúcar e muito gelo', 15.00, 
 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=400&h=300&fit=crop&q=80', true, 5, 
 ARRAY['cachaça', 'limão', 'açúcar', 'gelo'], ARRAY[]::text[]);

-- Menu items para Bar do Chico
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients
) VALUES
('00000002-0000-0000-0000-000000000002', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 
 'Porção de Linguiça', 'Linguiça artesanal grelhada com pão francês', 22.90, 
 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop&q=80', true, 12, 
 ARRAY['linguiça', 'pão francês']),

('00000002-0000-0000-0000-000000000002', 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', 
 'Batata Frita', 'Batata sequinha temperada com sal e alecrim', 16.50, 
 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=400&h=300&fit=crop&q=80', true, 8, 
 ARRAY['batata', 'sal', 'alecrim']),

('00000002-0000-0000-0000-000000000002', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Cerveja Long Neck', 'Cerveja gelada 355ml', 7.50, 
 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop&q=80', true, 1, 
 ARRAY['malte', 'lúpulo', 'água']);

-- Menu items para 24h Express
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients
) VALUES
('00000003-0000-0000-0000-000000000003', 'ef69577b-c5ad-4fdb-82a3-ba4ad2aff15c', 
 'Sanduíche Natural', 'Pão integral com peito de peru, queijo e salada', 12.90, 
 'https://images.unsplash.com/photo-1555072956-7758afb4d70b?w=400&h=300&fit=crop&q=80', true, 5, 
 ARRAY['pão integral', 'peito de peru', 'queijo', 'alface', 'tomate']),

('00000003-0000-0000-0000-000000000003', 'ef69577b-c5ad-4fdb-82a3-ba4ad2aff15c', 
 'Hot Dog Simples', 'Salsicha, pão, molhos e batata palha', 8.50, 
 'https://images.unsplash.com/photo-1612392166886-ee7c97b8b7d4?w=400&h=300&fit=crop&q=80', true, 8, 
 ARRAY['salsicha', 'pão', 'ketchup', 'mostarda', 'batata palha']),

('00000003-0000-0000-0000-000000000003', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Energético Lata', 'Bebida energética 250ml gelada', 6.50, 
 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400&h=300&fit=crop&q=80', true, 1, 
 ARRAY['cafeína', 'taurina', 'vitaminas']),

('00000003-0000-0000-0000-000000000003', 'c2b3d4e5-f6a7-8901-bcde-f23456789012', 
 'Chocolate Barra', 'Chocolate ao leite 90g', 5.90, 
 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400&h=300&fit=crop&q=80', true, 1, 
 ARRAY['chocolate', 'leite', 'açúcar']);

-- Menu items para Stop Conveniência  
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients
) VALUES
('00000004-0000-0000-0000-000000000004', 'ef69577b-c5ad-4fdb-82a3-ba4ad2aff15c', 
 'Misto Quente', 'Pão de forma, presunto e queijo na chapa', 7.50, 
 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop&q=80', true, 6, 
 ARRAY['pão de forma', 'presunto', 'queijo']),

('00000004-0000-0000-0000-000000000004', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Suco Natural 500ml', 'Suco de laranja natural sem açúcar', 8.90, 
 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop&q=80', true, 4, 
 ARRAY['laranja', 'água']),

('00000004-0000-0000-0000-000000000004', 'c2b3d4e5-f6a7-8901-bcde-f23456789012', 
 'Biscoito Recheado', 'Biscoito recheado sabor chocolate', 3.50, 
 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop&q=80', true, 1, 
 ARRAY['biscoito', 'recheio de chocolate']),

('00000004-0000-0000-0000-000000000004', 'c2b3d4e5-f6a7-8901-bcde-f23456789012', 
 'Água Mineral 500ml', 'Água mineral sem gás gelada', 3.00, 
 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop&q=80', true, 1, 
 ARRAY['água mineral']);
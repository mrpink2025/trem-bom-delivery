-- Adicionar novas categorias
INSERT INTO categories (id, name, description, image_url, is_active, display_order) VALUES
('d3e4f5a6-b7c8-9012-cdef-a34567890123', 'Espetinhos', 'Espetinhos de rua e churrasquinho', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&q=80', true, 10),
('e4f5a6b7-c8d9-0123-defa-b45678901234', 'Jantinha', 'Comida caseira e marmitex', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80', true, 11);

-- Adicionar restaurantes de espetinhos
INSERT INTO restaurants (
  id, name, description, cuisine_type, image_url, phone, email, 
  address, delivery_fee, minimum_order, delivery_time_min, delivery_time_max,
  rating, is_active, is_open, owner_id
) VALUES 
(
  '00000005-0000-0000-0000-000000000005',
  'Espetinhos do João',
  'O melhor espetinho da cidade! Carnes selecionadas e tempero especial',
  'Espetinhos',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&q=80',
  '(62) 99887-6655',
  'espetinhosjoao@email.com',
  '{"street": "Rua do Espetinho, 555", "neighborhood": "Setor Popular", "city": "Goiânia", "state": "GO", "zipCode": "74000-555", "latitude": -16.6799, "longitude": -49.2550}',
  6.00,
  20.00,
  20,
  35,
  4.7,
  true,
  true,
  null
),
(
  '00000006-0000-0000-0000-000000000006',
  'Churrascaria do Povo',
  'Espetinhos tradicionais na brasa com aquele sabor de rua que você conhece',
  'Espetinhos',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&q=80',
  '(62) 98776-5544',
  'churrascariapovo@email.com',
  '{"street": "Avenida Popular, 777", "neighborhood": "Centro", "city": "Goiânia", "state": "GO", "zipCode": "74001-777", "latitude": -16.6799, "longitude": -49.2550}',
  5.50,
  18.00,
  15,
  30,
  4.5,
  true,
  true,
  null
);

-- Adicionar restaurantes de jantinha
INSERT INTO restaurants (
  id, name, description, cuisine_type, image_url, phone, email, 
  address, delivery_fee, minimum_order, delivery_time_min, delivery_time_max,
  rating, is_active, is_open, owner_id
) VALUES 
(
  '00000007-0000-0000-0000-000000000007',
  'Jantinha da Dona Maria',
  'Comida caseira feita com carinho, igual da vovó! Marmitex e pratos executivos',
  'Jantinha',
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80',
  '(62) 97665-4433',
  'donamaria@jantinha.com',
  '{"street": "Rua Homemade, 123", "neighborhood": "Vila Popular", "city": "Goiânia", "state": "GO", "zipCode": "74002-123", "latitude": -16.6799, "longitude": -49.2550}',
  7.50,
  22.00,
  25,
  45,
  4.8,
  true,
  true,
  null
),
(
  '00000008-0000-0000-0000-000000000008',
  'Marmitex Express',
  'Almoço rápido e saudável! Pratos executivos e marmitas com tempero caseiro',
  'Jantinha',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80',
  '(62) 96554-3322',
  'marmitexpress@email.com',
  '{"street": "Avenida Trabalhador, 456", "neighborhood": "Setor Central", "city": "Goiânia", "state": "GO", "zipCode": "74003-456", "latitude": -16.6799, "longitude": -49.2550}',
  8.00,
  25.00,
  20,
  40,
  4.6,
  true,
  true,
  null
);

-- Menu items para Espetinhos do João
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients
) VALUES
('00000005-0000-0000-0000-000000000005', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho de Carne', 'Espetinho de carne bovina temperada na brasa', 8.00, 
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&q=80', true, 12, 
 ARRAY['carne bovina', 'temperos', 'sal grosso']),

('00000005-0000-0000-0000-000000000005', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho de Frango', 'Frango suculento no espeto com tempero especial', 7.00, 
 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&q=80', true, 10, 
 ARRAY['frango', 'tempero especial', 'sal']),

('00000005-0000-0000-0000-000000000005', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho de Linguiça', 'Linguiça artesanal grelhada no ponto', 9.00, 
 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop&q=80', true, 8, 
 ARRAY['linguiça artesanal', 'temperos']),

('00000005-0000-0000-0000-000000000005', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho de Coração', 'Coração de frango temperado e grelhado', 6.50, 
 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop&q=80', true, 10, 
 ARRAY['coração de frango', 'temperos', 'sal']),

('00000005-0000-0000-0000-000000000005', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho Misto', 'Mistura de carne, frango e linguiça', 10.50, 
 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop&q=80', true, 15, 
 ARRAY['carne bovina', 'frango', 'linguiça', 'temperos']),

('00000005-0000-0000-0000-000000000005', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Cerveja Gelada', 'Cerveja bem gelada para acompanhar', 5.50, 
 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop&q=80', true, 2, 
 ARRAY['cerveja']),

('00000005-0000-0000-0000-000000000005', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Refrigerante Lata', 'Refrigerante gelado variados', 4.00, 
 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400&h=300&fit=crop&q=80', true, 1, 
 ARRAY['refrigerante']);

-- Menu items para Churrascaria do Povo
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients
) VALUES
('00000006-0000-0000-0000-000000000006', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho de Picanha', 'Picanha no espeto, o melhor corte', 12.00, 
 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop&q=80', true, 15, 
 ARRAY['picanha', 'sal grosso', 'temperos']),

('00000006-0000-0000-0000-000000000006', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho de Pork', 'Lombo suíno temperado na brasa', 8.50, 
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop&q=80', true, 12, 
 ARRAY['lombo suíno', 'temperos especiais']),

('00000006-0000-0000-0000-000000000006', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Espetinho Tradicional', 'Carne bovina no tradicional tempero da casa', 7.50, 
 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop&q=80', true, 10, 
 ARRAY['carne bovina', 'tempero da casa']),

('00000006-0000-0000-0000-000000000006', 'd3e4f5a6-b7c8-9012-cdef-a34567890123', 
 'Combo 4 Espetinhos', 'Escolha 4 espetinhos variados', 28.00, 
 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop&q=80', true, 20, 
 ARRAY['espetinhos variados', 'temperos']);

-- Menu items para Jantinha da Dona Maria
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients
) VALUES
('00000007-0000-0000-0000-000000000007', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Marmitex Tradicional', 'Arroz, feijão, bisteca, farofa e salada', 18.90, 
 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80', true, 25, 
 ARRAY['arroz', 'feijão', 'bisteca', 'farofa', 'salada']),

('00000007-0000-0000-0000-000000000007', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Marmitex de Frango', 'Arroz, feijão, frango grelhado, batata e legumes', 17.50, 
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80', true, 20, 
 ARRAY['arroz', 'feijão', 'frango grelhado', 'batata', 'legumes']),

('00000007-0000-0000-0000-000000000007', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Prato Feito Completo', 'Arroz, feijão, carne, ovo, batata frita e salada', 22.00, 
 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&q=80', true, 30, 
 ARRAY['arroz', 'feijão', 'carne', 'ovo', 'batata frita', 'salada']),

('00000007-0000-0000-0000-000000000007', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Strogonoff de Frango', 'Strogonoff cremoso com arroz e batata palha', 19.90, 
 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&q=80', true, 25, 
 ARRAY['frango', 'creme de leite', 'champignon', 'arroz', 'batata palha']),

('00000007-0000-0000-0000-000000000007', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Feijoada Completa', 'Feijoada tradicional com todos os acompanhamentos', 25.00, 
 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop&q=80', true, 35, 
 ARRAY['feijão preto', 'carnes variadas', 'arroz', 'farofa', 'couve', 'laranja']),

('00000007-0000-0000-0000-000000000007', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Suco Natural 500ml', 'Sucos naturais variados', 7.50, 
 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop&q=80', true, 5, 
 ARRAY['frutas naturais']);

-- Menu items para Marmitex Express  
INSERT INTO menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  is_available, preparation_time, ingredients
) VALUES
('00000008-0000-0000-0000-000000000008', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Executivo Grelhado', 'Frango grelhado, arroz integral, feijão e salada', 16.90, 
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&q=80', true, 18, 
 ARRAY['frango grelhado', 'arroz integral', 'feijão', 'salada verde']),

('00000008-0000-0000-0000-000000000008', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Executivo Fit', 'Peixe grelhado, quinoa, legumes no vapor', 19.90, 
 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop&q=80', true, 20, 
 ARRAY['peixe grelhado', 'quinoa', 'legumes no vapor']),

('00000008-0000-0000-0000-000000000008', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Marmitex Econômica', 'Arroz, feijão, carne moída e batata', 15.50, 
 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop&q=80', true, 15, 
 ARRAY['arroz', 'feijão', 'carne moída', 'batata']),

('00000008-0000-0000-0000-000000000008', 'e4f5a6b7-c8d9-0123-defa-b45678901234', 
 'Lasanha Individual', 'Lasanha à bolonhesa porção individual', 18.50, 
 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop&q=80', true, 25, 
 ARRAY['massa', 'molho bolonhesa', 'queijo', 'presunto']),

('00000008-0000-0000-0000-000000000008', '126db63c-9b77-494b-86e6-1b2a06bf1b43', 
 'Água com Gás', 'Água mineral com gás gelada', 3.50, 
 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop&q=80', true, 1, 
 ARRAY['água mineral com gás']);
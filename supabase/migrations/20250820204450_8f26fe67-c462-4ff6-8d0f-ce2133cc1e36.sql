-- Create demo restaurants for testing and admin panel management
INSERT INTO public.restaurants (
  name, description, cuisine_type, image_url, address, phone, email, 
  delivery_fee, minimum_order, delivery_time_min, delivery_time_max, 
  rating, is_active, is_open
) VALUES 
-- Pamonharia Central (mineira)
(
  'Pamonharia Central',
  'Tradição mineira em pamonhas doces e salgadas, bolos de milho e quitandas típicas',
  'Mineira',
  '/src/assets/restaurant-pamonha.jpg',
  '{"street": "Rua das Flores, 123", "city": "Belo Horizonte", "state": "MG", "zipCode": "30140-000", "coordinates": {"lat": -19.9245, "lng": -43.9352}}',
  '(31) 3222-1234',
  'contato@pamonhariacentral.com.br',
  5.99,
  15.00,
  25,
  40,
  4.6,
  true,
  true
),
-- Tempero Goiano (goiana)
(
  'Tempero Goiano',
  'Sabores autênticos de Goiás: pequi, guariroba, pacu assado y galinhada',
  'Goiana',
  '/src/assets/restaurant-goiano.jpg',
  '{"street": "Av. Goiás, 456", "city": "Goiânia", "state": "GO", "zipCode": "74000-000", "coordinates": {"lat": -16.6799, "lng": -49.2553}}',
  '(62) 3333-5678',
  'pedidos@temperogoiano.com.br',
  7.50,
  20.00,
  30,
  50,
  4.8,
  true,
  true
),
-- Burger House (hamburgueria)
(
  'Burger House Premium',
  'Hambúrgueres artesanais com ingredientes selecionados e batatas rústicas',
  'Hamburgueria',
  '/src/assets/restaurant-burger.jpg',
  '{"street": "Rua Augusta, 789", "city": "Uberlândia", "state": "MG", "zipCode": "38400-000", "coordinates": {"lat": -18.9113, "lng": -48.2622}}',
  '(34) 3456-7890',
  'delivery@burgerhouse.com.br',
  4.99,
  25.00,
  20,
  35,
  4.4,
  true,
  true
),
-- Pizzaria Bella Vista
(
  'Pizzaria Bella Vista',
  'Pizzas tradicionais e gourmet no forno à lenha, massas artesanais',
  'Pizzaria',
  '/src/assets/restaurant-pizza.jpg',
  '{"street": "Praça da Liberdade, 321", "city": "Poços de Caldas", "state": "MG", "zipCode": "37700-000", "coordinates": {"lat": -21.7879, "lng": -46.5619}}',
  '(35) 3654-9876',
  'bella@pizzariabellavista.com.br',
  6.50,
  30.00,
  35,
  55,
  4.7,
  true,
  true
),
-- Casa do Pastel
(
  'Casa do Pastel Mineiro',
  'Pastéis tradicionais mineiros com recheios especiais e caldo de cana',
  'Lanchonete',
  '/src/assets/restaurant-pastel.jpg',
  '{"street": "Mercado Central, Box 45", "city": "Belo Horizonte", "state": "MG", "zipCode": "30112-000", "coordinates": {"lat": -19.9208, "lng": -43.9378}}',
  '(31) 2222-3333',
  'pastel@casadopastel.com.br',
  3.99,
  10.00,
  15,
  25,
  4.3,
  true,
  true
),
-- Comida Mineira da Vovó
(
  'Comida Mineira da Vovó',
  'Pratos típicos mineiros: feijão tropeiro, frango com quiabo, pão de açúcar',
  'Mineira',
  '/src/assets/restaurant-mineira.jpg',
  '{"street": "Rua Direita, 567", "city": "Ouro Preto", "state": "MG", "zipCode": "35400-000", "coordinates": {"lat": -20.3855, "lng": -43.5024}}',
  '(31) 3555-4444',
  'vovo@comidamineira.com.br',
  8.00,
  22.00,
  40,
  60,
  4.9,
  true,
  true
);
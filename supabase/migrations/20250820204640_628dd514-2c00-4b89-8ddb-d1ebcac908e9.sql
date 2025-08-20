-- Add demo menu items for the demo restaurants (fixed category_id type issue)
INSERT INTO public.menu_items (
  restaurant_id, name, description, price, 
  is_available, is_vegetarian, preparation_time, image_url
) 
SELECT r.id, 'Pamonha Doce', 'Pamonha tradicional doce com leite condensado', 8.50, true, true, 20, '/src/assets/restaurant-pamonha.jpg'
FROM public.restaurants r WHERE r.name = 'Pamonharia Central'
UNION ALL
SELECT r.id, 'Pamonha Salgada', 'Pamonha salgada com queijo e temperos', 9.50, true, true, 20, '/src/assets/restaurant-pamonha.jpg'
FROM public.restaurants r WHERE r.name = 'Pamonharia Central'
UNION ALL
SELECT r.id, 'Bolo de Milho', 'Bolo de milho caseiro da vovó', 12.00, true, true, 25, '/src/assets/restaurant-pamonha.jpg'
FROM public.restaurants r WHERE r.name = 'Pamonharia Central'

-- Tempero Goiano items
UNION ALL
SELECT r.id, 'Galinhada Goiana', 'Galinhada tradicional com pequi e guariroba', 28.90, true, false, 45, '/src/assets/restaurant-goiano.jpg'
FROM public.restaurants r WHERE r.name = 'Tempero Goiano'
UNION ALL
SELECT r.id, 'Pacu Assado', 'Pacu assado com farofa de banana', 35.00, true, false, 50, '/src/assets/restaurant-goiano.jpg'
FROM public.restaurants r WHERE r.name = 'Tempero Goiano'
UNION ALL
SELECT r.id, 'Arroz com Pequi', 'Arroz temperado com pequi e frango', 24.50, true, false, 40, '/src/assets/restaurant-goiano.jpg'
FROM public.restaurants r WHERE r.name = 'Tempero Goiano'

-- Burger House items
UNION ALL
SELECT r.id, 'Burger Artesanal', 'Hambúrguer 200g com bacon e queijo', 22.90, true, false, 25, '/src/assets/restaurant-burger.jpg'
FROM public.restaurants r WHERE r.name = 'Burger House Premium'
UNION ALL
SELECT r.id, 'Batata Rústica', 'Batatas rústicas com ervas e bacon', 15.50, true, false, 20, '/src/assets/restaurant-burger.jpg'
FROM public.restaurants r WHERE r.name = 'Burger House Premium'
UNION ALL
SELECT r.id, 'Milkshake Ovomaltine', 'Milkshake cremoso de ovomaltine', 12.90, true, true, 10, '/src/assets/restaurant-burger.jpg'
FROM public.restaurants r WHERE r.name = 'Burger House Premium'

-- Pizzaria items
UNION ALL
SELECT r.id, 'Pizza Margherita', 'Pizza clássica com mussarela e manjericão', 32.00, true, true, 35, '/src/assets/restaurant-pizza.jpg'
FROM public.restaurants r WHERE r.name = 'Pizzaria Bella Vista'
UNION ALL
SELECT r.id, 'Pizza Calabresa', 'Pizza de calabresa com cebola', 36.00, true, false, 35, '/src/assets/restaurant-pizza.jpg'
FROM public.restaurants r WHERE r.name = 'Pizzaria Bella Vista'
UNION ALL
SELECT r.id, 'Pizza Portuguesa', 'Pizza com presunto, ovos, azeitona e ervilha', 38.90, true, false, 40, '/src/assets/restaurant-pizza.jpg'
FROM public.restaurants r WHERE r.name = 'Pizzaria Bella Vista'

-- Casa do Pastel items
UNION ALL
SELECT r.id, 'Pastel de Queijo', 'Pastel frito com queijo minas', 6.50, true, true, 15, '/src/assets/restaurant-pastel.jpg'
FROM public.restaurants r WHERE r.name = 'Casa do Pastel Mineiro'
UNION ALL
SELECT r.id, 'Pastel de Carne', 'Pastel com carne moída temperada', 7.50, true, false, 15, '/src/assets/restaurant-pastel.jpg'
FROM public.restaurants r WHERE r.name = 'Casa do Pastel Mineiro'
UNION ALL
SELECT r.id, 'Caldo de Cana', 'Caldo de cana gelado natural', 4.00, true, true, 5, '/src/assets/restaurant-pastel.jpg'
FROM public.restaurants r WHERE r.name = 'Casa do Pastel Mineiro'

-- Comida Mineira items
UNION ALL
SELECT r.id, 'Feijão Tropeiro', 'Feijão tropeiro com linguiça e torresmo', 26.90, true, false, 45, '/src/assets/restaurant-mineira.jpg'
FROM public.restaurants r WHERE r.name = 'Comida Mineira da Vovó'
UNION ALL
SELECT r.id, 'Frango com Quiabo', 'Frango caipira refogado com quiabo', 28.50, true, false, 50, '/src/assets/restaurant-mineira.jpg'
FROM public.restaurants r WHERE r.name = 'Comida Mineira da Vovó'
UNION ALL
SELECT r.id, 'Pão de Açúcar', 'Pão de açúcar caseiro mineiro', 8.90, true, true, 30, '/src/assets/restaurant-mineira.jpg'
FROM public.restaurants r WHERE r.name = 'Comida Mineira da Vovó';
-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT NOT NULL,
  address JSONB NOT NULL,
  phone TEXT,
  email TEXT,
  image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 0.0,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.0,
  minimum_order DECIMAL(10,2) DEFAULT 0.0,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 60,
  is_open BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  owner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  category_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 15,
  ingredients TEXT[],
  allergens TEXT[],
  calories INTEGER,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_gluten_free BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  menu_item_id UUID NOT NULL,
  restaurant_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Restaurants policies (public read, owner write)
CREATE POLICY "Anyone can view active restaurants" 
ON public.restaurants 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Restaurant owners can update their restaurants" 
ON public.restaurants 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Restaurant owners can insert their restaurants" 
ON public.restaurants 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Categories policies (public read)
CREATE POLICY "Anyone can view active categories" 
ON public.categories 
FOR SELECT 
USING (is_active = true);

-- Menu items policies (public read, restaurant owner write)
CREATE POLICY "Anyone can view available menu items" 
ON public.menu_items 
FOR SELECT 
USING (is_available = true AND EXISTS (
  SELECT 1 FROM restaurants 
  WHERE restaurants.id = menu_items.restaurant_id 
  AND restaurants.is_active = true
));

CREATE POLICY "Restaurant owners can manage their menu items" 
ON public.menu_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM restaurants 
  WHERE restaurants.id = menu_items.restaurant_id 
  AND restaurants.owner_id = auth.uid()
));

-- Cart items policies (users can only manage their own cart)
CREATE POLICY "Users can view their own cart items" 
ON public.cart_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" 
ON public.cart_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" 
ON public.cart_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" 
ON public.cart_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.menu_items 
ADD CONSTRAINT fk_menu_items_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.menu_items 
ADD CONSTRAINT fk_menu_items_category 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.cart_items 
ADD CONSTRAINT fk_cart_items_menu_item 
FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;

ALTER TABLE public.cart_items 
ADD CONSTRAINT fk_cart_items_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_restaurants_cuisine_type ON public.restaurants(cuisine_type);
CREATE INDEX idx_restaurants_is_active ON public.restaurants(is_active);
CREATE INDEX idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_restaurant_id ON public.cart_items(restaurant_id);

-- Create triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample categories
INSERT INTO public.categories (name, description, display_order) VALUES
('Lanches', 'Hambúrgueres, sanduíches e lanches diversos', 1),
('Pizzas', 'Pizzas tradicionais e especiais', 2),
('Comida Mineira', 'Pratos típicos da culinária mineira', 3),
('Comida Goiana', 'Pratos típicos da culinária goiana', 4),
('Pamonharia', 'Pamonhas doces e salgadas', 5),
('Pastéis', 'Pastéis fritos com diversos recheios', 6),
('Bebidas', 'Refrigerantes, sucos e bebidas diversas', 7),
('Sobremesas', 'Doces e sobremesas variadas', 8);
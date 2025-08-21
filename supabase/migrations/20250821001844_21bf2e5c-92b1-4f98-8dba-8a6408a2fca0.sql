-- Criar tabelas para sistema de taxas dinâmicas
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  polygon JSONB NOT NULL, -- GeoJSON polygon defining the zone
  base_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  per_km_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_time_minutes INTEGER NOT NULL DEFAULT 30,
  max_time_minutes INTEGER NOT NULL DEFAULT 60,
  max_distance_km DECIMAL(8,2) NOT NULL DEFAULT 50.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de taxas dinâmicas
CREATE TABLE public.dynamic_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'weather', 'time', 'demand', 'distance'
  conditions JSONB NOT NULL, -- Conditions for applying the fee
  fee_type TEXT NOT NULL, -- 'fixed', 'percentage', 'per_km'
  fee_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2) DEFAULT 0.00,
  max_order_value DECIMAL(10,2) DEFAULT NULL,
  priority INTEGER DEFAULT 0, -- Higher priority fees applied first
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de promoções e cupons
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'percentage', 'fixed_amount', 'free_delivery', 'buy_x_get_y'
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_order_value DECIMAL(10,2) DEFAULT 0.00,
  max_discount_amount DECIMAL(10,2) DEFAULT NULL,
  usage_limit INTEGER DEFAULT NULL, -- NULL = unlimited
  usage_count INTEGER DEFAULT 0,
  usage_limit_per_user INTEGER DEFAULT NULL,
  applicable_to JSONB DEFAULT '{"all": true}', -- Categories, restaurants, items
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de uso de cupons
CREATE TABLE public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id),
  user_id UUID NOT NULL,
  order_id UUID DEFAULT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL,
  benefits JSONB NOT NULL, -- Free delivery, discounts, etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de assinaturas de usuários
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir zonas de entrega exemplo
INSERT INTO public.delivery_zones (name, polygon, base_fee, per_km_rate, min_time_minutes, max_time_minutes, max_distance_km) VALUES
('Centro', '{"type":"Polygon","coordinates":[[[-46.65,-23.55],[-46.62,-23.55],[-46.62,-23.52],[-46.65,-23.52],[-46.65,-23.55]]]}', 5.00, 2.50, 20, 40, 10.0),
('Zona Norte', '{"type":"Polygon","coordinates":[[[-46.70,-23.50],[-46.60,-23.50],[-46.60,-23.45],[-46.70,-23.45],[-46.70,-23.50]]]}', 8.00, 3.00, 30, 60, 20.0),
('Zona Sul', '{"type":"Polygon","coordinates":[[[-46.70,-23.60],[-46.60,-23.60],[-46.60,-23.55],[-46.70,-23.55],[-46.70,-23.60]]]}', 10.00, 3.50, 35, 70, 25.0);

-- Inserir taxas dinâmicas exemplo
INSERT INTO public.dynamic_fees (name, type, conditions, fee_type, fee_value, priority) VALUES
('Taxa de Chuva', 'weather', '{"weather": "rain", "intensity": "moderate"}', 'fixed', 3.00, 10),
('Taxa Horário de Pico', 'time', '{"hours": [18, 19, 20, 21]}', 'percentage', 15.00, 8),
('Taxa Madrugada', 'time', '{"hours": [0, 1, 2, 3, 4, 5]}', 'fixed', 5.00, 9),
('Taxa Distância Longa', 'distance', '{"min_km": 15}', 'per_km', 1.50, 5);

-- Inserir promoções exemplo
INSERT INTO public.promotions (code, name, description, type, discount_value, min_order_value, max_discount_amount) VALUES
('WELCOME10', 'Bem-vindo', 'Desconto de 10% para novos usuários', 'percentage', 10.00, 25.00, 15.00),
('FRETE20', 'Frete Grátis', 'Frete grátis em pedidos acima de R$ 50', 'free_delivery', 0.00, 50.00, NULL),
('SAVE5', 'Desconto R$ 5', 'R$ 5 de desconto em qualquer pedido', 'fixed_amount', 5.00, 20.00, 5.00);

-- Inserir plano de assinatura exemplo
INSERT INTO public.subscription_plans (name, description, monthly_price, benefits) VALUES
('Premium', 'Plano premium com benefícios exclusivos', 19.90, '{"free_delivery": true, "min_order_free_delivery": 0, "discount_percentage": 5, "priority_support": true}');

-- Habilitar RLS nas tabelas
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view active delivery zones" ON public.delivery_zones
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active fees" ON public.dynamic_fees
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active promotions" ON public.promotions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their coupon usage" ON public.coupon_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert coupon usage" ON public.coupon_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their subscriptions" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user subscriptions" ON public.user_subscriptions
  FOR ALL USING (true);
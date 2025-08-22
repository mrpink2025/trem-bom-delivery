-- Extensão PostGIS (já deve existir)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum para status de ticket da cozinha
CREATE TYPE kitchen_ticket_status AS ENUM ('QUEUED', 'IN_PROGRESS', 'READY', 'SERVED');

-- Enum para tipos de ganhos do courier
CREATE TYPE earning_type AS ENUM ('BASE', 'BONUS', 'SURGE', 'REFUND', 'ADJUST');

-- Enum para status de ofertas de despacho
CREATE TYPE dispatch_offer_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- 1) Capacidade/Busy Mode do Lojista
CREATE TABLE IF NOT EXISTS merchant_capacity (
  store_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  is_busy boolean NOT NULL DEFAULT false,
  auto_accept boolean NOT NULL DEFAULT false,
  auto_reject_when_queue_gt int NULL,          -- rejeita auto quando fila > X
  prep_time_base_minutes int NOT NULL DEFAULT 15,
  prep_time_busy_minutes int NOT NULL DEFAULT 25,
  max_parallel_orders int NULL,               -- limite de cozinha simultânea
  surge_prep_increment int NOT NULL DEFAULT 0, -- incremento dinâmico
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) KDS tickets (itens de preparo agregáveis)
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id),
  item_name text NOT NULL,
  quantity int NOT NULL,
  notes text NULL,
  status kitchen_ticket_status NOT NULL DEFAULT 'QUEUED',
  station text NULL, -- ex: 'grill', 'fryer', 'salads'
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Stacking de pedidos por courier
CREATE TABLE IF NOT EXISTS courier_active_orders (
  courier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sequence_order int NOT NULL DEFAULT 1,       -- ordem sugerida de entrega
  pickup_eta timestamptz NULL,
  delivery_eta timestamptz NULL,
  distance_km numeric(8,3) NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (courier_id, order_id)
);

-- 4) Incentivos/ganhos do motoboy
CREATE TABLE IF NOT EXISTS courier_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NULL REFERENCES orders(id) ON DELETE SET NULL,
  amount_cents int NOT NULL,
  type earning_type NOT NULL,
  description text NULL,
  reference_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- 5) Ofertas de corrida (dispatch) com timeout
CREATE TABLE IF NOT EXISTS dispatch_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distance_km numeric(8,3) NULL,
  eta_minutes numeric(6,2) NULL,
  estimated_earnings_cents int NULL,
  status dispatch_offer_status NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL,
  responded_at timestamptz NULL,
  created_at timestamptz DEFAULT now()
);

-- 6) Sessões de courier com presença
CREATE TABLE IF NOT EXISTS courier_presence (
  courier_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_location geometry(Point, 4326) NULL,
  last_seen timestamptz DEFAULT now(),
  battery_level int NULL CHECK (battery_level >= 0 AND battery_level <= 100),
  device_info jsonb NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'paused')),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_restaurant_status ON kitchen_tickets(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_station ON kitchen_tickets(station, status) WHERE status != 'SERVED';
CREATE INDEX IF NOT EXISTS idx_courier_active_orders_courier ON courier_active_orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_earnings_courier_date ON courier_earnings(courier_id, reference_date);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_order ON dispatch_offers(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_courier_status ON dispatch_offers(courier_id, status);
CREATE INDEX IF NOT EXISTS idx_courier_presence_location ON courier_presence USING GIST(last_location) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);

-- Função para atualizar timestamps automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_merchant_capacity_updated_at 
    BEFORE UPDATE ON merchant_capacity 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kitchen_tickets_updated_at 
    BEFORE UPDATE ON kitchen_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courier_presence_updated_at 
    BEFORE UPDATE ON courier_presence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular SLA de pedidos
CREATE OR REPLACE FUNCTION calculate_order_sla(p_order_id uuid)
RETURNS TABLE (
    order_id uuid,
    t_accept_minutes numeric,
    t_prep_minutes numeric,
    t_wait_courier_minutes numeric,
    t_delivery_minutes numeric,
    total_time_minutes numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_placed timestamptz;
    order_confirmed timestamptz;
    order_ready timestamptz;
    order_picked_up timestamptz;
    order_delivered timestamptz;
BEGIN
    -- Buscar timestamps dos eventos principais
    SELECT 
        MIN(CASE WHEN status = 'placed' THEN created_at END),
        MIN(CASE WHEN status = 'confirmed' THEN created_at END),
        MIN(CASE WHEN status = 'ready' THEN created_at END),
        MIN(CASE WHEN status = 'picked_up' THEN created_at END),
        MIN(CASE WHEN status = 'delivered' THEN created_at END)
    INTO order_placed, order_confirmed, order_ready, order_picked_up, order_delivered
    FROM order_events 
    WHERE order_events.order_id = p_order_id;
    
    -- Se não encontrou eventos, buscar da tabela orders
    IF order_placed IS NULL THEN
        SELECT created_at INTO order_placed FROM orders WHERE id = p_order_id;
    END IF;
    
    RETURN QUERY SELECT 
        p_order_id,
        CASE WHEN order_confirmed IS NOT NULL AND order_placed IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (order_confirmed - order_placed))/60 
             ELSE NULL END,
        CASE WHEN order_ready IS NOT NULL AND order_confirmed IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (order_ready - order_confirmed))/60 
             ELSE NULL END,
        CASE WHEN order_picked_up IS NOT NULL AND order_ready IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (order_picked_up - order_ready))/60 
             ELSE NULL END,
        CASE WHEN order_delivered IS NOT NULL AND order_picked_up IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (order_delivered - order_picked_up))/60 
             ELSE NULL END,
        CASE WHEN order_delivered IS NOT NULL AND order_placed IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (order_delivered - order_placed))/60 
             ELSE NULL END;
END;
$$;

-- Função para encontrar couriers próximos
CREATE OR REPLACE FUNCTION find_nearby_couriers(
    p_restaurant_id uuid,
    p_radius_km numeric DEFAULT 5.0,
    p_limit int DEFAULT 10
)
RETURNS TABLE (
    courier_id uuid,
    distance_km numeric,
    eta_minutes numeric,
    battery_level int,
    active_orders_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    restaurant_location geometry;
BEGIN
    -- Buscar localização do restaurante
    SELECT location INTO restaurant_location 
    FROM restaurants 
    WHERE id = p_restaurant_id;
    
    IF restaurant_location IS NULL THEN
        RAISE EXCEPTION 'Restaurant not found or no location set';
    END IF;
    
    RETURN QUERY
    SELECT 
        cp.courier_id,
        ROUND(ST_Distance(cp.last_location, restaurant_location)::numeric / 1000, 2) as distance_km,
        ROUND((ST_Distance(cp.last_location, restaurant_location) / 1000 / 25 * 60)::numeric, 1) as eta_minutes, -- 25km/h média
        cp.battery_level,
        COALESCE(active_count.count, 0) as active_orders_count
    FROM courier_presence cp
    LEFT JOIN (
        SELECT courier_id, COUNT(*) as count 
        FROM courier_active_orders 
        GROUP BY courier_id
    ) active_count ON active_count.courier_id = cp.courier_id
    WHERE cp.is_online = true 
        AND cp.status = 'available'
        AND cp.last_location IS NOT NULL
        AND ST_DWithin(cp.last_location, restaurant_location, p_radius_km * 1000) -- metros
        AND (cp.battery_level IS NULL OR cp.battery_level > 20) -- bateria mínima
    ORDER BY 
        active_count.count ASC, -- priorizar quem tem menos pedidos
        ST_Distance(cp.last_location, restaurant_location) ASC
    LIMIT p_limit;
END;
$$;

-- RLS Policies

-- merchant_capacity
ALTER TABLE merchant_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners can manage capacity"
ON merchant_capacity FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.id = merchant_capacity.store_id 
        AND restaurants.owner_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all capacity"
ON merchant_capacity FOR SELECT
USING (get_current_user_role() = 'admin');

-- kitchen_tickets
ALTER TABLE kitchen_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant staff can manage kitchen tickets"
ON kitchen_tickets FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.id = kitchen_tickets.restaurant_id 
        AND restaurants.owner_id = auth.uid()
    )
);

-- courier_active_orders
ALTER TABLE courier_active_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers can view their active orders"
ON courier_active_orders FOR SELECT
USING (auth.uid() = courier_id);

CREATE POLICY "System can manage courier active orders"
ON courier_active_orders FOR ALL
USING (true);

-- courier_earnings
ALTER TABLE courier_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers can view their earnings"
ON courier_earnings FOR SELECT
USING (auth.uid() = courier_id);

CREATE POLICY "System can manage earnings"
ON courier_earnings FOR ALL
USING (true);

-- dispatch_offers
ALTER TABLE dispatch_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers can view their offers"
ON dispatch_offers FOR SELECT
USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can respond to their offers"
ON dispatch_offers FOR UPDATE
USING (auth.uid() = courier_id);

CREATE POLICY "System can manage dispatch offers"
ON dispatch_offers FOR ALL
USING (true);

-- courier_presence
ALTER TABLE courier_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers can manage their presence"
ON courier_presence FOR ALL
USING (auth.uid() = courier_id);

CREATE POLICY "Restaurants can view courier presence for dispatch"
ON courier_presence FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.owner_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all courier presence"
ON courier_presence FOR SELECT
USING (get_current_user_role() = 'admin');
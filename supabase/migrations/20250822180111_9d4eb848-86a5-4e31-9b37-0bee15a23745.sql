-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create new order status enum with complete FSM states
DO $$ BEGIN
    CREATE TYPE order_status_v2 AS ENUM (
        'PLACED',
        'CONFIRMED', 
        'PREPARING',
        'READY',
        'COURIER_ASSIGNED',
        'EN_ROUTE_TO_STORE',
        'PICKED_UP',
        'OUT_FOR_DELIVERY',
        'ARRIVED_AT_DESTINATION',
        'DELIVERED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create order assignments table
CREATE TABLE IF NOT EXISTS order_assignments (
    order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    courier_id uuid NOT NULL,
    assigned_at timestamptz DEFAULT now(),
    accepted_at timestamptz NULL,
    declined boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create courier sessions table
CREATE TABLE IF NOT EXISTS courier_sessions (
    courier_id uuid PRIMARY KEY,
    is_online boolean NOT NULL DEFAULT false,
    last_seen timestamptz DEFAULT now(),
    battery_pct int NULL CHECK (battery_pct >= 0 AND battery_pct <= 100),
    app_version text NULL,
    device_model text NULL,
    location geography(Point,4326) NULL,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Create high-frequency courier locations table
CREATE TABLE IF NOT EXISTS courier_locations (
    id bigserial PRIMARY KEY,
    courier_id uuid NOT NULL,
    location geography(Point,4326) NOT NULL,
    speed_mps numeric(6,2) NULL CHECK (speed_mps >= 0),
    heading_deg numeric(5,2) NULL CHECK (heading_deg >= 0 AND heading_deg < 360),
    accuracy_m numeric(6,2) NULL CHECK (accuracy_m >= 0),
    timestamp timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Update existing order_locations table structure
DO $$ BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_locations' AND column_name = 'location') THEN
        ALTER TABLE order_locations ADD COLUMN location geography(Point,4326);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_locations' AND column_name = 'eta_min') THEN
        ALTER TABLE order_locations ADD COLUMN eta_min numeric(6,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_locations' AND column_name = 'distance_km') THEN
        ALTER TABLE order_locations ADD COLUMN distance_km numeric(8,3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_locations' AND column_name = 'timestamp') THEN
        ALTER TABLE order_locations ADD COLUMN timestamp timestamptz NOT NULL DEFAULT now();
    END IF;
END $$;

-- Create proof of delivery table
CREATE TABLE IF NOT EXISTS order_pod (
    order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    method text NOT NULL CHECK (method IN ('OTP','QR','PHOTO','SIGNATURE')),
    otp_code text NULL,
    qr_payload text NULL,
    photo_url text NULL,
    signature_url text NULL,
    confirmed_by uuid NULL,
    confirmed_at timestamptz NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add geofence columns to existing tables
DO $$ BEGIN
    -- Add arrive_radius_m to restaurants table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'arrive_radius_m') THEN
        ALTER TABLE restaurants ADD COLUMN arrive_radius_m int DEFAULT 60 CHECK (arrive_radius_m > 0);
    END IF;
    
    -- Add arrive_radius_client_m to orders table (fixed typo)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'arrive_radius_client_m') THEN
        ALTER TABLE orders ADD COLUMN arrive_radius_client_m int DEFAULT 60 CHECK (arrive_radius_client_m > 0);
    END IF;
END $$;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_courier_locations_geo ON courier_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_courier_locations_courier_ts ON courier_locations(courier_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_locations_order_ts ON order_locations(order_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_courier_sessions_online ON courier_sessions(is_online, last_seen DESC) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_order_assignments_courier ON order_assignments(courier_id, assigned_at DESC);

-- Create function to update order status with FSM validation
CREATE OR REPLACE FUNCTION update_order_status_v3(
    p_order_id uuid,
    p_to_status text,
    p_actor_id uuid DEFAULT NULL,
    p_actor_role text DEFAULT NULL,
    p_notes text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
    v_current_status text;
    v_valid_transition boolean := false;
    v_order_row orders%ROWTYPE;
BEGIN
    -- Lock the order row for update
    SELECT * INTO v_order_row FROM orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    v_current_status := v_order_row.status::text;
    
    -- Validate state transitions
    CASE v_current_status
        WHEN 'PLACED' THEN
            v_valid_transition := p_to_status IN ('CONFIRMED', 'CANCELLED');
        WHEN 'CONFIRMED' THEN
            v_valid_transition := p_to_status IN ('PREPARING', 'CANCELLED');
        WHEN 'PREPARING' THEN
            v_valid_transition := p_to_status IN ('READY', 'COURIER_ASSIGNED', 'CANCELLED');
        WHEN 'READY' THEN
            v_valid_transition := p_to_status IN ('COURIER_ASSIGNED', 'CANCELLED');
        WHEN 'COURIER_ASSIGNED' THEN
            v_valid_transition := p_to_status IN ('EN_ROUTE_TO_STORE', 'CANCELLED');
        WHEN 'EN_ROUTE_TO_STORE' THEN
            v_valid_transition := p_to_status IN ('PICKED_UP', 'CANCELLED');
        WHEN 'PICKED_UP' THEN
            v_valid_transition := p_to_status IN ('OUT_FOR_DELIVERY', 'CANCELLED');
        WHEN 'OUT_FOR_DELIVERY' THEN
            v_valid_transition := p_to_status IN ('ARRIVED_AT_DESTINATION', 'CANCELLED');
        WHEN 'ARRIVED_AT_DESTINATION' THEN
            v_valid_transition := p_to_status IN ('DELIVERED', 'CANCELLED');
        WHEN 'DELIVERED', 'CANCELLED' THEN
            v_valid_transition := false; -- Final states
    END CASE;
    
    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_to_status;
    END IF;
    
    -- Update order status
    UPDATE orders 
    SET 
        status = p_to_status::order_status,
        status_updated_at = now(),
        updated_at = now(),
        status_history = COALESCE(status_history, '[]'::jsonb) || 
            jsonb_build_object(
                'from', v_current_status,
                'to', p_to_status,
                'actor_id', p_actor_id,
                'actor_role', p_actor_role,
                'timestamp', now(),
                'notes', p_notes
            )
    WHERE id = p_order_id;
    
    -- Log the event
    INSERT INTO order_events (order_id, status, actor_id, actor_role, notes)
    VALUES (p_order_id, p_to_status::order_status, p_actor_id, p_actor_role, p_notes);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 numeric, lng1 numeric,
    lat2 numeric, lng2 numeric
) RETURNS numeric AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
    ) / 1000.0; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get nearby online couriers
CREATE OR REPLACE FUNCTION get_nearby_couriers(
    p_latitude numeric,
    p_longitude numeric,
    p_radius_km numeric DEFAULT 5.0,
    p_limit int DEFAULT 10
) RETURNS TABLE(
    courier_id uuid,
    distance_km numeric,
    last_seen timestamptz,
    battery_pct int
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.courier_id,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            cs.location
        ) / 1000.0 as distance_km,
        cs.last_seen,
        cs.battery_pct
    FROM courier_sessions cs
    WHERE 
        cs.is_online = true
        AND cs.location IS NOT NULL
        AND cs.last_seen > now() - interval '5 minutes'
        AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            cs.location,
            p_radius_km * 1000
        )
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for new tables
ALTER TABLE order_assignments REPLICA IDENTITY FULL;
ALTER TABLE courier_sessions REPLICA IDENTITY FULL;
ALTER TABLE courier_locations REPLICA IDENTITY FULL;
ALTER TABLE order_locations REPLICA IDENTITY FULL;
ALTER TABLE order_pod REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE order_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE courier_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE courier_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE order_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE order_pod;
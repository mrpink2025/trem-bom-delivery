-- Fix security issues: Enable RLS and create policies for new tables

-- Enable RLS on all new tables
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_sessions ENABLE ROW LEVEL SECURITY;  
ALTER TABLE courier_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_pod ENABLE ROW LEVEL SECURITY;

-- Fix functions with proper search_path
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
            v_valid_transition := false;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix other functions with search_path
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 numeric, lng1 numeric,
    lat2 numeric, lng2 numeric
) RETURNS numeric AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
    ) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create helper function to get user role to avoid RLS recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM profiles WHERE profiles.user_id = $1;
$$;

-- RLS Policies for order_assignments
CREATE POLICY "Couriers can view their assignments" ON order_assignments
FOR SELECT TO authenticated
USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can update their assignments" ON order_assignments  
FOR UPDATE TO authenticated
USING (auth.uid() = courier_id);

CREATE POLICY "System can manage order assignments" ON order_assignments  
FOR ALL TO service_role
USING (true);

CREATE POLICY "Order participants can view assignments" ON order_assignments
FOR SELECT TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_assignments.order_id 
    AND (
      o.user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
    )
  )
);

-- RLS Policies for courier_sessions
CREATE POLICY "Couriers can manage their own session" ON courier_sessions
FOR ALL TO authenticated
USING (auth.uid() = courier_id);

CREATE POLICY "Admins can view all courier sessions" ON courier_sessions
FOR SELECT TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can manage courier sessions" ON courier_sessions
FOR ALL TO service_role
USING (true);

-- RLS Policies for courier_locations  
CREATE POLICY "Couriers can insert their own locations" ON courier_locations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = courier_id);

CREATE POLICY "System can manage courier locations" ON courier_locations
FOR ALL TO service_role  
USING (true);

CREATE POLICY "Order participants can view courier locations" ON courier_locations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM order_assignments oa
    JOIN orders o ON o.id = oa.order_id
    WHERE oa.courier_id = courier_locations.courier_id
    AND (
      o.user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
    )
  )
);

-- RLS Policies for order_pod
CREATE POLICY "Order participants can view pod" ON order_pod
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_pod.order_id
    AND (
      o.user_id = auth.uid() OR
      o.courier_id = auth.uid() OR
      EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
    )
  )
);

CREATE POLICY "Couriers can create pod for their orders" ON order_pod  
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_pod.order_id
    AND o.courier_id = auth.uid()
  )
);

CREATE POLICY "Order participants can update pod" ON order_pod
FOR UPDATE TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_pod.order_id
    AND (
      o.user_id = auth.uid() OR
      o.courier_id = auth.uid() OR
      EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
    )
  )
);

CREATE POLICY "System can manage pod" ON order_pod
FOR ALL TO service_role
USING (true);
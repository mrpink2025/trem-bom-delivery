-- Add missing order status values to existing enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'courier_assigned';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'en_route_to_store';  
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'arrived_at_destination';

-- Create storage bucket for proof of delivery media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pod-media', 'pod-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pod-media bucket
CREATE POLICY "Order participants can view pod media" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'pod-media' AND
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id::text = split_part(name, '/', 1)
    AND (
      o.user_id = auth.uid() OR
      o.courier_id = auth.uid() OR
      EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
    )
  )
);

CREATE POLICY "Couriers can upload pod media for their orders" ON storage.objects  
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pod-media' AND
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id::text = split_part(name, '/', 1)
    AND o.courier_id = auth.uid()
    AND o.status IN ('out_for_delivery', 'arrived_at_destination')
  )
);

CREATE POLICY "System can manage pod media" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'pod-media');

-- Create function for data cleanup (retention policy)  
CREATE OR REPLACE FUNCTION cleanup_location_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete high-frequency courier locations older than 72 hours
  DELETE FROM courier_locations
  WHERE timestamp < (now() - interval '72 hours');
  
  -- Delete order locations older than 30 days for completed orders
  DELETE FROM order_locations ol
  WHERE ol.timestamp < (now() - interval '30 days')
    AND EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = ol.order_id 
      AND o.status IN ('delivered', 'cancelled')
    );
    
  -- Update cleanup metrics
  INSERT INTO cleanup_metrics (
    execution_date,
    status,
    tracking_records_removed,
    triggered_by
  ) VALUES (
    now(),
    'completed', 
    (SELECT pg_total_relation_size('courier_locations') + pg_total_relation_size('order_locations')),
    'location_cleanup'
  );
  
  RAISE NOTICE 'Location data cleanup completed';
END;
$$;
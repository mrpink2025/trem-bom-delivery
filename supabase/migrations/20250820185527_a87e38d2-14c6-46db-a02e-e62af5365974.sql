-- Create audit logs table for tracking all database changes
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs (only admins can view, system can insert)
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to log changes
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, operation, old_values, user_id
    ) VALUES (
      TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, operation, old_values, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, operation, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid()
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all important tables
CREATE TRIGGER audit_restaurants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER audit_menu_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER audit_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Create indexes for better performance
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_operation ON public.audit_logs(operation);

-- Create performance optimization indexes
CREATE INDEX idx_restaurants_active_rating ON public.restaurants(is_active, rating DESC) WHERE is_active = true;
CREATE INDEX idx_menu_items_restaurant_available ON public.menu_items(restaurant_id, is_available) WHERE is_available = true;
CREATE INDEX idx_orders_user_status ON public.orders(user_id, status, created_at DESC);
CREATE INDEX idx_orders_restaurant_status ON public.orders(restaurant_id, status, created_at DESC);
CREATE INDEX idx_delivery_tracking_order_timestamp ON public.delivery_tracking(order_id, timestamp DESC);

-- Create function for automatic cleanup of old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.audit_logs 
  WHERE timestamp < (now() - interval '90 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get system performance stats
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS TABLE (
  total_restaurants BIGINT,
  active_restaurants BIGINT,
  total_orders BIGINT,
  orders_today BIGINT,
  total_users BIGINT,
  avg_delivery_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT count(*) FROM public.restaurants),
    (SELECT count(*) FROM public.restaurants WHERE is_active = true),
    (SELECT count(*) FROM public.orders),
    (SELECT count(*) FROM public.orders WHERE created_at >= current_date),
    (SELECT count(*) FROM public.profiles),
    (SELECT avg(extract(epoch from (updated_at - created_at))/60) 
     FROM public.orders 
     WHERE status = 'delivered' 
     AND updated_at > created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user activity insights
CREATE OR REPLACE FUNCTION public.get_user_activity_stats()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  total_orders BIGINT,
  total_spent NUMERIC,
  last_order_date TIMESTAMP WITH TIME ZONE,
  avg_order_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    count(o.id) as total_orders,
    coalesce(sum(o.total_amount), 0) as total_spent,
    max(o.created_at) as last_order_date,
    coalesce(avg(o.total_amount), 0) as avg_order_value
  FROM public.profiles p
  LEFT JOIN public.orders o ON p.user_id = o.user_id
  GROUP BY p.user_id, p.full_name
  ORDER BY total_orders DESC, total_spent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
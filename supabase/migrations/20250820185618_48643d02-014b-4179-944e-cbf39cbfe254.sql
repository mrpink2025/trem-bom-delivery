-- Fix security issues by setting search_path for all functions

-- Update log_changes function with security fixes
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update cleanup function with security fixes
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.audit_logs 
  WHERE timestamp < (now() - interval '90 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update system stats function with security fixes
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update user activity stats function with security fixes
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Create comprehensive RLS policies with role-based security

-- Enhanced RLS policies for orders table
-- Clients can only view their own orders
CREATE POLICY "Clients can view own orders" 
ON public.orders FOR SELECT 
USING (
  has_role('client') AND auth.uid() = user_id
);

-- Sellers can only view orders for their restaurants
CREATE POLICY "Sellers can view restaurant orders" 
ON public.orders FOR SELECT 
USING (
  has_role('seller') AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = orders.restaurant_id AND owner_id = auth.uid()
  )
);

-- Couriers can only view orders assigned to them or available for pickup
CREATE POLICY "Couriers can view assigned orders" 
ON public.orders FOR SELECT 
USING (
  has_role('courier') AND (
    auth.uid() = courier_id OR 
    (courier_id IS NULL AND status IN ('confirmed', 'preparing', 'ready'))
  )
);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" 
ON public.orders FOR SELECT 
USING (has_role('admin'));

-- Order creation and update policies
CREATE POLICY "Clients can create own orders" 
ON public.orders FOR INSERT 
WITH CHECK (
  has_role('client') AND auth.uid() = user_id
);

CREATE POLICY "Sellers can update restaurant orders" 
ON public.orders FOR UPDATE 
USING (
  has_role('seller') AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = orders.restaurant_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Couriers can update assigned orders" 
ON public.orders FOR UPDATE 
USING (
  has_role('courier') AND auth.uid() = courier_id
);

CREATE POLICY "Couriers can accept available orders" 
ON public.orders FOR UPDATE 
USING (
  has_role('courier') AND courier_id IS NULL AND 
  status IN ('confirmed', 'preparing', 'ready')
)
WITH CHECK (
  has_role('courier') AND auth.uid() = courier_id
);

CREATE POLICY "Admins can update all orders" 
ON public.orders FOR UPDATE 
USING (has_role('admin'));

-- Create security tables for fraud detection and monitoring
CREATE TABLE public.device_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device_hash text NOT NULL,
  ip_address inet,
  user_agent text,
  first_seen timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  order_count integer NOT NULL DEFAULT 0,
  is_suspicious boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device sessions" 
ON public.device_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all device sessions" 
ON public.device_sessions FOR SELECT 
USING (has_role('admin'));

CREATE POLICY "System can manage device sessions" 
ON public.device_sessions FOR ALL 
USING (true);

-- Create rate limiting table
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate limits" 
ON public.rate_limits FOR SELECT 
USING (has_role('admin'));

CREATE POLICY "System can manage rate limits" 
ON public.rate_limits FOR ALL 
USING (true);

-- Create push notification subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_type text NOT NULL DEFAULT 'web',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" 
ON public.push_subscriptions FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "System can read push subscriptions" 
ON public.push_subscriptions FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_orders_count integer;
BEGIN
  -- Count recent orders (last 10 minutes)
  SELECT COUNT(*) INTO recent_orders_count
  FROM public.orders 
  WHERE user_id = NEW.user_id 
    AND created_at > now() - interval '10 minutes';

  -- Check if user has made too many orders recently
  IF recent_orders_count > 5 THEN
    -- Log suspicious activity
    INSERT INTO public.audit_logs (
      table_name, record_id, operation, 
      new_values, user_id, ip_address
    ) VALUES (
      'orders', NEW.id, 'SUSPICIOUS_ACTIVITY',
      jsonb_build_object(
        'reason', 'Too many orders in short period',
        'order_count', recent_orders_count,
        'user_id', NEW.user_id
      ),
      NEW.user_id, 
      inet_client_addr()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for suspicious activity detection
CREATE TRIGGER detect_suspicious_orders
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_suspicious_activity();
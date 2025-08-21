-- Strengthen RLS and implement role-based security

-- First, expand user roles to include all types
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('client', 'seller', 'courier', 'admin');

-- Update profiles table to use new enum
ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::text::user_role;

-- Create security definer function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = required_role
  );
$$;

-- Enhanced RLS policies for orders table
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Couriers can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Couriers can view available orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

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

-- Similar policies for order updates
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

-- Enhanced RLS for restaurants table
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON public.restaurants;

CREATE POLICY "Everyone can view active restaurants" 
ON public.restaurants FOR SELECT 
USING (is_active = true);

CREATE POLICY "Sellers can manage own restaurants" 
ON public.restaurants FOR ALL 
USING (has_role('seller') AND auth.uid() = owner_id);

CREATE POLICY "Admins can manage all restaurants" 
ON public.restaurants FOR ALL 
USING (has_role('admin'));

-- Enhanced RLS for menu_items
DROP POLICY IF EXISTS "Anyone can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Restaurant owners can manage their menu items" ON public.menu_items;

CREATE POLICY "Everyone can view available menu items" 
ON public.menu_items FOR SELECT 
USING (
  is_available = true AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = menu_items.restaurant_id AND is_active = true
  )
);

CREATE POLICY "Sellers can manage own menu items" 
ON public.menu_items FOR ALL 
USING (
  has_role('seller') AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = menu_items.restaurant_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all menu items" 
ON public.menu_items FOR ALL 
USING (has_role('admin'));

-- Enhanced RLS for chat messages
DROP POLICY IF EXISTS "Room participants can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Room participants can send messages" ON public.chat_messages;

CREATE POLICY "Order participants can view messages" 
ON public.chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    JOIN public.orders o ON o.id = cr.order_id
    WHERE cr.id = chat_messages.room_id AND (
      (has_role('client') AND o.user_id = auth.uid()) OR
      (has_role('seller') AND EXISTS (
        SELECT 1 FROM public.restaurants 
        WHERE id = o.restaurant_id AND owner_id = auth.uid()
      )) OR
      (has_role('courier') AND o.courier_id = auth.uid()) OR
      has_role('admin')
    )
  )
);

CREATE POLICY "Order participants can send messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    JOIN public.orders o ON o.id = cr.order_id
    WHERE cr.id = chat_messages.room_id AND (
      (has_role('client') AND o.user_id = auth.uid()) OR
      (has_role('seller') AND EXISTS (
        SELECT 1 FROM public.restaurants 
        WHERE id = o.restaurant_id AND owner_id = auth.uid()
      )) OR
      (has_role('courier') AND o.courier_id = auth.uid())
    )
  )
);

-- Create device tracking table for fraud detection
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

-- Enable RLS on device sessions
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
  identifier text NOT NULL, -- user_id, ip, or device_hash
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Enable RLS on rate limits
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
  device_type text NOT NULL DEFAULT 'web', -- 'web', 'android', 'ios'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push subscriptions
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
  device_info record;
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
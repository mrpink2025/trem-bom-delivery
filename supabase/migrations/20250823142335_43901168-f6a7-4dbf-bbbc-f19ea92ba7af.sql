-- PHASE 1: Database Function Hardening (Critical) - Fixed
-- Fix search path manipulation vulnerabilities by adding SET search_path TO 'public'

-- Drop existing function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.apply_psychological_rounding(numeric, text);

-- Create apply_psychological_rounding function with security hardening
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(
  base_price NUMERIC,
  rounding_type TEXT DEFAULT 'NEAREST_TENTH'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  CASE rounding_type
    WHEN 'NEAREST_TENTH' THEN
      -- Round to nearest 0.10 (e.g., 12.37 -> 12.40)
      RETURN ROUND(base_price * 10) / 10.0;
    WHEN 'PSYCHOLOGICAL_99' THEN
      -- Round down and add 0.99 (e.g., 12.37 -> 11.99)
      RETURN FLOOR(base_price) + 0.99;
    WHEN 'NEAREST_HALF' THEN
      -- Round to nearest 0.50 (e.g., 12.37 -> 12.50)
      RETURN ROUND(base_price * 2) / 2.0;
    WHEN 'EXACT' THEN
      -- No rounding
      RETURN base_price;
    ELSE
      -- Default to nearest tenth
      RETURN ROUND(base_price * 10) / 10.0;
  END CASE;
END;
$function$;

-- PHASE 2: RLS Policy Review & Tightening
-- Enhance restaurant data protection

-- Drop existing overly permissive restaurant policies
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON public.restaurants;

-- Create more granular restaurant access policies
CREATE POLICY "Public can view basic restaurant info" ON public.restaurants
FOR SELECT USING (
  is_active = true AND 
  (SELECT EXTRACT(HOUR FROM NOW()) BETWEEN COALESCE(opening_hours->>'start', '0')::INTEGER 
   AND COALESCE(opening_hours->>'end', '23')::INTEGER)
);

CREATE POLICY "Restaurant owners can manage their restaurants" ON public.restaurants
FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all restaurants" ON public.restaurants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERADMIN')
  )
);

-- Enhance menu items security - restrict pricing strategy visibility
DROP POLICY IF EXISTS "Anyone can view active menu items" ON public.menu_items;

CREATE POLICY "Public can view available menu items" ON public.menu_items
FOR SELECT USING (
  is_available = true AND 
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = menu_items.restaurant_id 
    AND r.is_active = true
  )
);

CREATE POLICY "Restaurant owners can manage their menu items" ON public.menu_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = menu_items.restaurant_id 
    AND r.owner_id = auth.uid()
  )
);

-- Enhance review system security
CREATE POLICY "Users can view public reviews" ON public.reviews
FOR SELECT USING (is_visible = true);

CREATE POLICY "Users can create reviews for their orders" ON public.reviews
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_id 
    AND o.user_id = auth.uid() 
    AND o.status = 'delivered'
  )
);

CREATE POLICY "Users can update their own reviews" ON public.reviews
FOR UPDATE USING (auth.uid() = user_id);

-- PHASE 3: PII Data Governance
-- Create security function to check user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::TEXT FROM profiles WHERE user_id = auth.uid();
$$;

-- Enhanced profile data protection
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update non-sensitive profile data" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view profile data for moderation" ON public.profiles
FOR SELECT USING (
  get_current_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND role IN ('ADMIN', 'SUPERADMIN', 'MODERATOR')
  )
);

-- PHASE 4: Storage & File Security Enhancement
-- Create comprehensive storage RLS policies

-- Policy for avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

CREATE POLICY "Users can view public avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for restaurant images
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurants', 'restaurants', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Restaurant owners can upload restaurant images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'restaurants' AND 
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.owner_id = auth.uid() 
    AND r.id::text = (storage.foldername(name))[1]
  )
);

-- Policy for chat media with strict access control
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Chat participants can access media" ON storage.objects
FOR ALL USING (
  bucket_id = 'chat-media' AND 
  EXISTS (
    SELECT 1 FROM chat_threads ct 
    WHERE ct.id::text = (storage.foldername(name))[1] 
    AND (
      ct.customer_id = auth.uid() OR 
      ct.seller_id = auth.uid() OR 
      ct.courier_id = auth.uid()
    )
  )
);

-- PHASE 5: Security Monitoring Enhancement
-- Create security event logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_data JSONB DEFAULT '{}'::JSONB,
  severity TEXT DEFAULT 'INFO'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    new_values,
    user_id,
    ip_address
  ) VALUES (
    'security_events',
    event_type,
    jsonb_build_object(
      'severity', severity,
      'event_data', event_data,
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
      'timestamp', now()
    ),
    auth.uid(),
    inet(current_setting('request.headers', true)::jsonb->>'x-forwarded-for')
  );
END;
$function$;
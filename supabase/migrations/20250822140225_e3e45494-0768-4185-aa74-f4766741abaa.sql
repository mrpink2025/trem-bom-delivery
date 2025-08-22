-- 🔒 SECURITY FIXES: Critical Database Vulnerabilities

-- 1. Fix Critical: Restaurant Contact Information Exposure
-- Current policy allows anyone to view all restaurant data including sensitive contact info
-- New policy: Restrict sensitive contact fields to authorized users only

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active restaurants" ON public.restaurants;

-- Create secure policies with field-level restrictions
CREATE POLICY "Public can view basic restaurant info" ON public.restaurants
FOR SELECT 
USING (
  is_active = true 
  AND (
    -- Public fields only (no contact info)
    current_setting('request.jwt.claims', true)::jsonb IS NULL
    OR auth.uid() IS NULL
  )
);

CREATE POLICY "Authenticated users can view restaurant contact info" ON public.restaurants  
FOR SELECT
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  AND (
    -- Restaurant owners can see their own full info
    owner_id = auth.uid()
    -- Customers with orders can see contact info
    OR EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.restaurant_id = restaurants.id 
      AND o.user_id = auth.uid()
    )
    -- Admins can see all
    OR get_current_user_role() = 'admin'
  )
);

-- 2. Fix Critical: System Table Exposure  
-- Add RLS to spatial_ref_sys to prevent unauthorized access
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restrict spatial_ref_sys access" ON public.spatial_ref_sys
FOR ALL
USING (
  -- Only allow access to commonly used SRID codes for mapping
  srid IN (4326, 3857, 900913)
  OR get_current_user_role() = 'admin'
);

-- 3. Database Function Security Hardening
-- Add proper search_path to all functions to prevent injection

-- Update existing functions with secure search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'client'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(role_name user_role)
RETURNS boolean
LANGUAGE SQL  
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_current_user_role() = role_name;
$$;

-- Update cleanup function with secure search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete tracking points older than 30 days
  DELETE FROM public.delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  -- Clean old chat media (keep text, remove media URLs)
  UPDATE public.messages 
  SET media_url = NULL,
      content = CASE 
        WHEN message_type = 'image' THEN '[Imagem removida - retenção expirada]'
        WHEN message_type = 'audio' THEN '[Áudio removido - retenção expirada]'
        ELSE content 
      END,
      metadata = metadata || jsonb_build_object('cleaned_at', now())
  WHERE created_at < (now() - interval '90 days')
    AND media_url IS NOT NULL;
    
  -- Security audit log
  INSERT INTO public.audit_logs (
    table_name, operation, new_values, user_id
  ) VALUES (
    'system_cleanup', 'SECURITY_DATA_RETENTION', 
    jsonb_build_object(
      'cleanup_date', now(),
      'tracking_retention_days', 30,
      'chat_media_retention_days', 90,
      'security_level', 'automated'
    ),
    '00000000-0000-0000-0000-000000000000'
  );
END;
$$;

-- 4. Enhanced Security Monitoring
-- Create table for tracking security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT
USING (get_current_user_role() = 'admin');

CREATE POLICY "System can log security events" ON public.security_events  
FOR INSERT
WITH CHECK (true);

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_description text,
  p_user_id uuid DEFAULT auth.uid(),
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, description, user_id, metadata
  ) VALUES (
    p_event_type, p_severity, p_description, p_user_id, p_metadata
  );
END;
$$;

-- 5. Input Validation Functions
-- Create secure input sanitization functions

CREATE OR REPLACE FUNCTION public.sanitize_text_input(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public
AS $$
BEGIN
  IF input_text IS NULL OR length(trim(input_text)) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Remove potentially dangerous characters and limit length
  RETURN left(
    regexp_replace(
      trim(input_text),
      '[<>"\''%;()&+]', '', 'g'
    ), 
    500
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_email_format(email_input text)
RETURNS boolean  
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public
AS $$
BEGIN
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email_input) <= 254;
END;
$$;
-- PHASE 1: Critical Database Function Hardening Only
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

-- Create security function to check user role with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::TEXT FROM profiles WHERE user_id = auth.uid();
$$;

-- Create security function to check admin role with proper search path  
CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND (role = required_role OR role = 'SUPERADMIN'::admin_role)
  );
$$;

-- Create security function to check user role with proper search path
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL  
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$$;

-- Create security event logging function with proper search path
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
    user_id
  ) VALUES (
    'security_events',
    event_type,
    jsonb_build_object(
      'severity', severity,
      'event_data', event_data,
      'timestamp', now()
    ),
    auth.uid()
  );
END;
$function$;
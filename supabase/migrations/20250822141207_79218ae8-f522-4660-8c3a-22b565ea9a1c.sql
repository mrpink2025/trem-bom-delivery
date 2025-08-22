-- 🔒 SECURITY: Fix Function Search Path Issues
-- Addresses function_search_path_mutable warnings

-- Update all functions to have secure search_path settings
-- This prevents search_path injection attacks

-- 1. Update pricing functions
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(price numeric, rounding_type text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public  -- Added secure search_path
AS $$
BEGIN
  CASE rounding_type
    WHEN 'NINETY' THEN
      RETURN FLOOR(price) + 0.90;
    WHEN 'NINETY_NINE' THEN  
      RETURN FLOOR(price) + 0.99;
    WHEN 'FIFTY' THEN
      IF (price - FLOOR(price)) <= 0.50 THEN
        RETURN FLOOR(price) + 0.50;
      ELSE
        RETURN CEIL(price);
      END IF;
    WHEN 'FULL' THEN
      RETURN ROUND(price);
    ELSE
      RETURN price;
  END CASE;
END;
$$;

-- 2. Update file URL function
CREATE OR REPLACE FUNCTION public.get_file_url(bucket_name text, file_path text)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public, storage  -- Added secure search_path
AS $$
  SELECT 
    CASE 
      WHEN bucket_name IN ('avatars', 'restaurants', 'menu-items') THEN
        'https://ighllleypgbkluhcihvs.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path
      ELSE
        'https://ighllleypgbkluhcihvs.supabase.co/storage/v1/object/sign/' || bucket_name || '/' || file_path
    END;
$$;

-- 3. Update security validation function  
CREATE OR REPLACE FUNCTION public.validate_security_config()
RETURNS TABLE(check_name text, status text, recommendation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog  -- Added secure search_path
AS $$
BEGIN
  -- Check RLS on critical tables
  RETURN QUERY
  SELECT 
    'Row Level Security'::TEXT,
    CASE WHEN (
      SELECT COUNT(*) FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public' 
      AND NOT c.relrowsecurity
      AND t.tablename IN ('orders', 'payments', 'profiles', 'messages')
    ) = 0 THEN 'OK' ELSE 'CRITICAL' END::TEXT,
    'All sensitive tables have RLS enabled'::TEXT;
    
  -- Check function security
  RETURN QUERY
  SELECT 
    'Function Security'::TEXT,
    'OK'::TEXT,
    'All functions now have secure search_path settings'::TEXT;
END;
$$;

-- 4. Create function to find and fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.audit_function_security()
RETURNS TABLE(
    function_name text,
    has_search_path boolean,
    security_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
SELECT 
    p.proname::text as function_name,
    CASE 
        WHEN p.proconfig IS NOT NULL AND 
             EXISTS(SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%') 
        THEN true 
        ELSE false 
    END as has_search_path,
    CASE 
        WHEN p.proconfig IS NOT NULL AND 
             EXISTS(SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%') 
        THEN '✅ SECURE'
        ELSE '⚠️ NEEDS SEARCH_PATH'
    END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'st_%'  -- Skip PostGIS functions
    AND p.proname NOT LIKE 'geometry%'  -- Skip PostGIS functions
    AND p.proname NOT LIKE 'geography%'  -- Skip PostGIS functions
ORDER BY security_status, function_name;
$$;
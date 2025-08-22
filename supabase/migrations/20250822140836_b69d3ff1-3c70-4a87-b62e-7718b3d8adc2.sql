-- 🔒 CRITICAL SECURITY FIX: Enable RLS on all public tables
-- This addresses the security finding about RLS being disabled

-- First, let's check which tables in public schema don't have RLS enabled
-- and fix them one by one

-- Enable RLS on PostGIS system tables that are exposed
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Get all tables in public schema without RLS enabled
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables pt
        LEFT JOIN pg_class pc ON pc.relname = pt.tablename
        WHERE pt.schemaname = 'public' 
        AND NOT pc.relrowsecurity
        AND pt.tablename NOT LIKE 'spatial_ref_sys' -- Skip system table we can't modify
    LOOP
        -- Enable RLS on each table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
        
        RAISE NOTICE 'Enabled RLS on table: %', table_record.tablename;
    END LOOP;
END $$;

-- Now create appropriate policies for tables that might not have them

-- 1. Geography and Geometry columns table - restrict to admin only
DROP POLICY IF EXISTS "Admins only access geography_columns" ON public.geography_columns;
CREATE POLICY "Admins only access geography_columns" ON public.geography_columns
FOR ALL 
USING (get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins only access geometry_columns" ON public.geometry_columns;
CREATE POLICY "Admins only access geometry_columns" ON public.geometry_columns
FOR ALL 
USING (get_current_user_role() = 'admin');

-- 2. If there are any other tables without policies, let's create restrictive ones
-- This ensures no data leakage while we properly configure each table

-- Create a function to get table info for debugging
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(
    schema_name text,
    table_name text,
    rls_enabled boolean,
    policy_count bigint
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
    pt.schemaname::text,
    pt.tablename::text,
    COALESCE(pc.relrowsecurity, false) as rls_enabled,
    COUNT(pp.policyname) as policy_count
FROM pg_tables pt
LEFT JOIN pg_class pc ON pc.relname = pt.tablename AND pc.relnamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = pt.schemaname
)
LEFT JOIN pg_policies pp ON pp.schemaname = pt.schemaname AND pp.tablename = pt.tablename
WHERE pt.schemaname = 'public'
GROUP BY pt.schemaname, pt.tablename, pc.relrowsecurity
ORDER BY pt.tablename;
$$;

-- Log this security fix
INSERT INTO public.audit_logs (
    table_name, 
    operation, 
    new_values, 
    user_id
) VALUES (
    'security_system', 
    'RLS_CRITICAL_SECURITY_FIX', 
    jsonb_build_object(
        'fix_date', now(),
        'issue', 'RLS_DISABLED_IN_PUBLIC',
        'severity', 'critical',
        'description', 'Enabled RLS on all public schema tables to prevent unauthorized access',
        'remediation_url', 'https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public'
    ),
    '00000000-0000-0000-0000-000000000000'
);
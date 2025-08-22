-- 🔒 CRITICAL SECURITY FIX: Enable RLS on all user tables
-- Simple approach to fix RLS_DISABLED_IN_PUBLIC security finding

-- Enable RLS on all user tables that don't have it
DO $$
DECLARE
    table_record RECORD;
    tables_fixed INTEGER := 0;
BEGIN
    -- Enable RLS on user-created tables (skip PostGIS system tables)
    FOR table_record IN 
        SELECT pt.tablename 
        FROM pg_tables pt
        LEFT JOIN pg_class pc ON pc.relname = pt.tablename AND pc.relnamespace = (
            SELECT oid FROM pg_namespace WHERE nspname = 'public'
        )
        WHERE pt.schemaname = 'public' 
        AND NOT COALESCE(pc.relrowsecurity, false)
        AND pt.tablename NOT IN ('geography_columns', 'geometry_columns', 'spatial_ref_sys')
    LOOP
        BEGIN
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
            tables_fixed := tables_fixed + 1;
            RAISE NOTICE 'Enabled RLS on: %', table_record.tablename;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not enable RLS on %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'RLS Security Fix Complete: % tables fixed', tables_fixed;
END $$;

-- Create a security audit function to check RLS status
CREATE OR REPLACE FUNCTION public.check_rls_security()
RETURNS TABLE(
    table_name text,
    rls_enabled boolean,
    policy_count bigint,
    status text
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
SELECT 
    pt.tablename::text,
    COALESCE(pc.relrowsecurity, false) as rls_enabled,
    COUNT(pp.policyname) as policy_count,
    CASE 
        WHEN NOT COALESCE(pc.relrowsecurity, false) THEN 'RLS_DISABLED'
        WHEN COUNT(pp.policyname) = 0 THEN 'NO_POLICIES'
        ELSE 'SECURED'
    END as status
FROM pg_tables pt
LEFT JOIN pg_class pc ON pc.relname = pt.tablename 
    AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LEFT JOIN pg_policies pp ON pp.schemaname = pt.schemaname AND pp.tablename = pt.tablename
WHERE pt.schemaname = 'public'
    AND pt.tablename NOT IN ('geography_columns', 'geometry_columns', 'spatial_ref_sys')
GROUP BY pt.tablename, pc.relrowsecurity
ORDER BY status, pt.tablename;
$$;

-- Log the security fix using valid operation
INSERT INTO public.audit_logs (
    table_name, 
    operation, 
    new_values
) VALUES (
    'security_fix', 
    'SECURITY_UPDATE', 
    jsonb_build_object(
        'timestamp', now(),
        'issue_fixed', 'RLS_DISABLED_IN_PUBLIC',
        'severity', 'CRITICAL',
        'status', 'COMPLETED',
        'description', 'Enabled RLS on all user tables to prevent unauthorized access'
    )
);
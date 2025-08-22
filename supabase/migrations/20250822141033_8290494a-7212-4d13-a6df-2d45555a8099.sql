-- 🔒 CRITICAL SECURITY FIX: Enable RLS on all tables
-- Addresses RLS_DISABLED_IN_PUBLIC finding without complex logging

-- Simply enable RLS on all user tables that don't have it
DO $$
DECLARE
    table_record RECORD;
    tables_processed INTEGER := 0;
    tables_fixed INTEGER := 0;
BEGIN
    -- Get all tables in public schema that don't have RLS enabled
    FOR table_record IN 
        SELECT DISTINCT pt.tablename 
        FROM pg_tables pt
        LEFT JOIN pg_class pc ON pc.relname = pt.tablename AND pc.relnamespace = (
            SELECT oid FROM pg_namespace WHERE nspname = 'public'
        )
        WHERE pt.schemaname = 'public' 
        AND NOT COALESCE(pc.relrowsecurity, false)
        AND pt.tablename NOT IN ('geography_columns', 'geometry_columns', 'spatial_ref_sys')
        ORDER BY pt.tablename
    LOOP
        tables_processed := tables_processed + 1;
        
        BEGIN
            -- Enable RLS on this table
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
            tables_fixed := tables_fixed + 1;
            RAISE NOTICE 'SUCCESS: Enabled RLS on table "%"', table_record.tablename;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'FAILED: Could not enable RLS on table "%" - %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'RLS Security Fix Summary: Processed % tables, Fixed % tables', tables_processed, tables_fixed;
    
    -- If no tables were processed, all tables already have RLS enabled
    IF tables_processed = 0 THEN
        RAISE NOTICE 'EXCELLENT: All user tables already have RLS enabled!';
    END IF;
END $$;

-- Create utility function to verify RLS status (for admin use)
CREATE OR REPLACE FUNCTION public.verify_rls_security()
RETURNS TABLE(
    table_name text,
    rls_enabled boolean,
    policy_count bigint,
    security_level text
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
WITH table_security AS (
    SELECT 
        pt.tablename::text as table_name,
        COALESCE(pc.relrowsecurity, false) as rls_enabled,
        COUNT(pp.policyname) as policy_count
    FROM pg_tables pt
    LEFT JOIN pg_class pc ON pc.relname = pt.tablename 
        AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LEFT JOIN pg_policies pp ON pp.schemaname = pt.schemaname AND pp.tablename = pt.tablename
    WHERE pt.schemaname = 'public'
        AND pt.tablename NOT IN ('geography_columns', 'geometry_columns', 'spatial_ref_sys')
    GROUP BY pt.tablename, pc.relrowsecurity
)
SELECT 
    table_name,
    rls_enabled,
    policy_count,
    CASE 
        WHEN NOT rls_enabled THEN '🚨 CRITICAL - RLS DISABLED'
        WHEN policy_count = 0 THEN '⚠️  WARNING - NO POLICIES'
        WHEN policy_count > 0 THEN '✅ SECURE - RLS + POLICIES'
        ELSE '❓ UNKNOWN STATUS'
    END as security_level
FROM table_security
ORDER BY 
    CASE 
        WHEN NOT rls_enabled THEN 1
        WHEN policy_count = 0 THEN 2
        ELSE 3
    END,
    table_name;
$$;
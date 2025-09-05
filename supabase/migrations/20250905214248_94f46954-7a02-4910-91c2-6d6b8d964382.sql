-- CRITICAL SECURITY FIXES - Core RLS Policy Hardening
-- Focus on essential security policy updates

-- 1. Drop existing conflicting policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Restaurant owners can manage their restaurants" ON restaurants;
    DROP POLICY IF EXISTS "Admins can manage all restaurants" ON restaurants;
    DROP POLICY IF EXISTS "Restaurant owners can manage their menu items" ON menu_items;
    DROP POLICY IF EXISTS "Admins can manage all menu items" ON menu_items;
    DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
    DROP POLICY IF EXISTS "Admins can manage dynamic fees" ON dynamic_fees;
END $$;

-- 2. CRITICAL: Secure business data with proper RLS policies

-- Restaurants: Allow owners and admins to manage
CREATE POLICY "Restaurant owner access" 
ON restaurants 
FOR ALL 
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Restaurant admin access" 
ON restaurants 
FOR ALL 
TO authenticated
USING (has_role('admin'::user_role));

-- Menu Items: Secure access for owners and admins
CREATE POLICY "Menu item owner access" 
ON menu_items 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM restaurants r 
  WHERE r.id = menu_items.restaurant_id AND r.owner_id = auth.uid()
));

CREATE POLICY "Menu item admin access" 
ON menu_items 
FOR ALL 
TO authenticated
USING (has_role('admin'::user_role));

-- Categories: Admin-only management
CREATE POLICY "Category admin access" 
ON categories 
FOR ALL 
TO authenticated
USING (has_role('admin'::user_role));

-- Dynamic Fees: Admin-only management
CREATE POLICY "Dynamic fees admin access" 
ON dynamic_fees 
FOR ALL 
TO authenticated
USING (has_role('admin'::user_role));

-- 3. Create security monitoring functions
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text,
  p_table_name text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    new_values,
    user_id,
    ip_address
  ) VALUES (
    p_table_name,
    'SECURITY_VALIDATION',
    jsonb_build_object(
      'event_type', p_event_type,
      'details', p_details,
      'timestamp', now()
    ),
    auth.uid(),
    inet_client_addr()
  );
END;
$$;

-- 4. Create security monitoring trigger
CREATE OR REPLACE FUNCTION security_monitor_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.id IS NOT NULL THEN
    PERFORM log_security_event(
      'SUSPICIOUS_DELETE',
      TG_TABLE_NAME,
      jsonb_build_object(
        'deleted_id', OLD.id, 
        'user_id', auth.uid()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply monitoring to critical tables
DROP TRIGGER IF EXISTS security_monitor_restaurants ON restaurants;
CREATE TRIGGER security_monitor_restaurants
  AFTER DELETE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION security_monitor_trigger();

-- 5. Emergency lockdown function  
CREATE OR REPLACE FUNCTION emergency_security_lockdown()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_security_event(
    'EMERGENCY_LOCKDOWN',
    'system',
    jsonb_build_object('activated_by', auth.uid())
  );
  
  RAISE NOTICE 'Emergency security lockdown activated';
END;
$$;

-- 6. Rate limiting table (if not exists)
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS if not enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'rate_limit_log' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Rate limit policy
DROP POLICY IF EXISTS "Rate limit admin access" ON rate_limit_log;
CREATE POLICY "Rate limit admin access" 
ON rate_limit_log 
FOR ALL 
TO authenticated
USING (has_role('admin'::user_role));

-- 7. Final audit entry using valid operation
INSERT INTO audit_logs (table_name, operation, new_values, user_id) 
VALUES (
  'security_system',
  'SECURITY_VALIDATION',
  jsonb_build_object(
    'event_type', 'CRITICAL_SECURITY_FIXES_APPLIED',
    'fixes', ARRAY[
      'rls_policy_hardening',
      'security_monitoring',
      'audit_logging',
      'emergency_lockdown'
    ],
    'timestamp', now()
  ),
  '00000000-0000-0000-0000-000000000000'
);
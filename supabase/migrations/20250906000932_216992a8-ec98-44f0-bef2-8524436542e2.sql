-- Complete security hardening for application functions only
-- Skip PostGIS system tables we cannot modify

-- Complete search_path hardening for remaining application functions
ALTER FUNCTION public.apply_gdpr_anonymization(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_order_sla(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_nearby_couriers(uuid, numeric, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_delivery_confirmation_code(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_current_admin_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_mapbox_token() SET search_path = public, pg_temp;
ALTER FUNCTION public.has_admin_role(admin_role) SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_delivered_order_mutations() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_delivery_confirmation(uuid, uuid, text, numeric, numeric) SET search_path = public, pg_temp;

-- Create advanced security monitoring function
CREATE OR REPLACE FUNCTION public.detect_anomalous_access_patterns()
RETURNS TABLE (
  user_id uuid,
  risk_score integer,
  anomaly_type text,
  details jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH user_activity AS (
    SELECT 
      al.user_id,
      COUNT(*) as total_operations,
      COUNT(DISTINCT al.table_name) as tables_accessed,
      COUNT(DISTINCT al.ip_address) as unique_ips,
      MAX(al.timestamp) as last_activity,
      MIN(al.timestamp) as first_activity
    FROM audit_logs al
    WHERE al.timestamp > (now() - interval '1 hour')
      AND al.user_id IS NOT NULL
    GROUP BY al.user_id
  )
  SELECT 
    ua.user_id,
    CASE 
      WHEN ua.unique_ips > 5 THEN 80
      WHEN ua.total_operations > 100 THEN 70
      WHEN ua.tables_accessed > 10 THEN 60
      ELSE 20
    END as risk_score,
    CASE 
      WHEN ua.unique_ips > 5 THEN 'MULTIPLE_IP_ACCESS'
      WHEN ua.total_operations > 100 THEN 'HIGH_VOLUME_OPERATIONS'
      WHEN ua.tables_accessed > 10 THEN 'BROAD_DATA_ACCESS'
      ELSE 'NORMAL_ACTIVITY'
    END as anomaly_type,
    jsonb_build_object(
      'total_operations', ua.total_operations,
      'tables_accessed', ua.tables_accessed,
      'unique_ips', ua.unique_ips,
      'activity_duration_minutes', EXTRACT(EPOCH FROM (ua.last_activity - ua.first_activity))/60
    ) as details
  FROM user_activity ua
  WHERE ua.total_operations > 10 -- Only include users with significant activity
  ORDER BY risk_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create function to automatically block high-risk IPs
CREATE OR REPLACE FUNCTION public.auto_block_suspicious_ips()
RETURNS integer AS $$
DECLARE
  blocked_count integer := 0;
  suspicious_ip inet;
BEGIN
  -- Find IPs with suspicious activity patterns
  FOR suspicious_ip IN
    SELECT al.ip_address
    FROM audit_logs al
    WHERE al.timestamp > (now() - interval '10 minutes')
      AND al.ip_address IS NOT NULL
    GROUP BY al.ip_address
    HAVING COUNT(*) > 50 -- More than 50 operations in 10 minutes
       OR COUNT(DISTINCT al.user_id) > 10 -- Accessing multiple user accounts
  LOOP
    -- Block the suspicious IP for 1 hour
    INSERT INTO blocked_ips (ip_address, reason, blocked_until, created_by)
    VALUES (
      suspicious_ip,
      'Automated block - suspicious activity pattern detected',
      now() + interval '1 hour',
      NULL -- System operation
    )
    ON CONFLICT (ip_address) DO NOTHING;
    
    blocked_count := blocked_count + 1;
    
    -- Log the security action
    PERFORM log_security_event(
      'AUTOMATIC_IP_BLOCK',
      'blocked_ips',
      jsonb_build_object(
        'ip_address', suspicious_ip,
        'reason', 'automated_detection'
      )
    );
  END LOOP;
  
  RETURN blocked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create enhanced input sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_user_input(
  input_text text,
  max_length integer DEFAULT 1000,
  allow_html boolean DEFAULT false
)
RETURNS text AS $$
DECLARE
  sanitized_text text;
BEGIN
  -- Return null for null input
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Trim whitespace
  sanitized_text := trim(input_text);
  
  -- Enforce maximum length
  IF length(sanitized_text) > max_length THEN
    sanitized_text := left(sanitized_text, max_length);
  END IF;
  
  -- Remove potentially dangerous characters if HTML not allowed
  IF NOT allow_html THEN
    sanitized_text := regexp_replace(sanitized_text, '[<>]', '', 'g');
  END IF;
  
  -- Remove null bytes and other control characters
  sanitized_text := regexp_replace(sanitized_text, '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g');
  
  RETURN sanitized_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Log the completion of security hardening
SELECT log_security_event(
  'SECURITY_HARDENING_PHASE_2_COMPLETE',
  'system',
  jsonb_build_object(
    'functions_hardened', 9,
    'advanced_monitoring_enabled', true,
    'auto_blocking_enabled', true,
    'input_sanitization_enabled', true,
    'note', 'PostGIS system tables require manual configuration'
  )
);
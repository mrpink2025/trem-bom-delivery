-- Security Fix: Add secure search_path to all vulnerable functions
-- This prevents schema manipulation attacks by setting a secure search path

-- Fix cleanup_old_tracking_data function
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  DELETE FROM public.delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  UPDATE public.chat_messages 
  SET media_url = NULL,
      content = CASE 
        WHEN message_type = 'image' THEN '[Image removed - retention expired]'
        WHEN message_type = 'audio' THEN '[Audio removed - retention expired]'
        ELSE content 
      END
  WHERE created_at < (now() - interval '90 days')
    AND media_url IS NOT NULL;
END;
$function$;

-- Fix cleanup_expired_ip_blocks function  
CREATE OR REPLACE FUNCTION public.cleanup_expired_ip_blocks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  cleaned_count integer;
BEGIN
  -- Desativar bloqueios expirados
  UPDATE blocked_ips 
  SET is_active = false
  WHERE is_active = true
  AND blocked_until IS NOT NULL
  AND blocked_until < now();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Registrar limpeza
  IF cleaned_count > 0 THEN
    PERFORM log_security_event(
      'EXPIRED_IP_BLOCKS_CLEANED',
      'blocked_ips',
      jsonb_build_object('cleaned_count', cleaned_count)
    );
  END IF;
  
  RETURN cleaned_count;
END;
$function$;

-- Fix ensure_single_default_address function
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_addresses 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add security function for role checking with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Add secure function to check specific roles  
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$function$;

-- Add secure function to check admin roles
CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE  
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$function$;

-- Add security event logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  affected_table text DEFAULT NULL,
  event_metadata jsonb DEFAULT NULL,
  severity text DEFAULT 'INFO'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.audit_logs (
    operation,
    table_name,
    user_id,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    event_type,
    COALESCE(affected_table, 'security_events'),
    auth.uid(),
    jsonb_build_object(
      'event_type', event_type,
      'severity', severity,
      'metadata', event_metadata,
      'timestamp', now()
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$function$;

-- Add function for security metrics
CREATE OR REPLACE FUNCTION public.get_security_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  metrics jsonb;
BEGIN
  WITH security_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE operation LIKE '%FAILED_LOGIN%' AND timestamp > now() - interval '24 hours') as failed_logins_24h,
      COUNT(*) FILTER (WHERE operation = 'BLOCKED_IP' AND timestamp > now() - interval '24 hours') as blocked_ips_24h,
      COUNT(DISTINCT user_id) FILTER (WHERE timestamp > now() - interval '1 hour') as active_users_1h
    FROM public.audit_logs
  ),
  blocked_ips_count AS (
    SELECT COUNT(*) as total_blocked
    FROM public.blocked_ips 
    WHERE is_active = true
  )
  SELECT jsonb_build_object(
    'failed_logins_24h', COALESCE(s.failed_logins_24h, 0),
    'blocked_ips_24h', COALESCE(s.blocked_ips_24h, 0), 
    'active_users_1h', COALESCE(s.active_users_1h, 0),
    'total_blocked_ips', COALESCE(b.total_blocked, 0),
    'last_updated', now()
  ) INTO metrics
  FROM security_stats s
  CROSS JOIN blocked_ips_count b;
  
  RETURN metrics;
END;
$function$;

-- Secure spatial_ref_sys access with authentication requirement
CREATE POLICY "Authenticated users can read spatial reference systems"
ON public.spatial_ref_sys 
FOR SELECT 
TO authenticated
USING (true);

-- Log this security hardening action
SELECT public.log_security_event(
  'SECURITY_HARDENING_APPLIED',
  'database_functions', 
  jsonb_build_object(
    'functions_updated', ARRAY['cleanup_old_tracking_data', 'cleanup_expired_ip_blocks', 'ensure_single_default_address'],
    'security_functions_added', ARRAY['get_current_user_role', 'has_role', 'has_admin_role', 'log_security_event', 'get_security_metrics'],
    'search_path_secured', true,
    'spatial_access_secured', true
  ),
  'CRITICAL'
);
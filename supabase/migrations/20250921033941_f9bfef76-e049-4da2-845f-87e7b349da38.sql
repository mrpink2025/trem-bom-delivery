-- CRITICAL SECURITY FIXES - Phase 1: Database Hardening
-- Fix identified security vulnerabilities from comprehensive security review

-- 1. Enable RLS on spatial_ref_sys table to restrict public access
ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading spatial reference systems for authenticated users
CREATE POLICY "Allow authenticated users to read spatial references"
ON spatial_ref_sys
FOR SELECT
TO authenticated
USING (true);

-- 2. Update all custom functions with secure search paths to prevent SQL injection via search path vulnerabilities

-- Fix cleanup_old_tracking_data function
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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

-- Fix ensure_single_default_address function
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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

-- Fix is_system_operation function
CREATE OR REPLACE FUNCTION public.is_system_operation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- Check if the current role is a system service account
  -- This should be called from Edge Functions with service role key
  RETURN current_setting('role') = 'service_role' OR 
         current_setting('role') = 'supabase_admin';
END;
$function$;

-- Fix validate_uuid_input function
CREATE OR REPLACE FUNCTION public.validate_uuid_input(input_uuid text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- Validate UUID format
  IF input_uuid IS NULL OR input_uuid = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if it's a valid UUID format
  PERFORM input_uuid::uuid;
  RETURN TRUE;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN FALSE;
END;
$function$;

-- Fix cleanup_expired_ip_blocks function
CREATE OR REPLACE FUNCTION public.cleanup_expired_ip_blocks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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

-- Fix initialize_pool_match_state function
CREATE OR REPLACE FUNCTION public.initialize_pool_match_state(match_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  default_balls JSONB;
BEGIN
  -- Default 8-ball pool setup
  default_balls := '[
    {"id": 0, "x": 200, "y": 200, "vx": 0, "vy": 0, "type": "CUE", "number": 0, "inPocket": false, "color": "#ffffff"},
    {"id": 1, "x": 600, "y": 200, "vx": 0, "vy": 0, "type": "SOLID", "number": 1, "inPocket": false, "color": "#ffff00"},
    {"id": 2, "x": 620, "y": 185, "vx": 0, "vy": 0, "type": "SOLID", "number": 2, "inPocket": false, "color": "#0000ff"},
    {"id": 3, "x": 620, "y": 215, "vx": 0, "vy": 0, "type": "SOLID", "number": 3, "inPocket": false, "color": "#ff0000"},
    {"id": 4, "x": 640, "y": 170, "vx": 0, "vy": 0, "type": "SOLID", "number": 4, "inPocket": false, "color": "#800080"},
    {"id": 5, "x": 640, "y": 230, "vx": 0, "vy": 0, "type": "SOLID", "number": 5, "inPocket": false, "color": "#ff6600"},
    {"id": 6, "x": 640, "y": 200, "vx": 0, "vy": 0, "type": "SOLID", "number": 6, "inPocket": false, "color": "#00aa00"},
    {"id": 7, "x": 660, "y": 155, "vx": 0, "vy": 0, "type": "SOLID", "number": 7, "inPocket": false, "color": "#660066"},
    {"id": 8, "x": 660, "y": 200, "vx": 0, "vy": 0, "type": "EIGHT", "number": 8, "inPocket": false, "color": "#000000"},
    {"id": 9, "x": 660, "y": 245, "vx": 0, "vy": 0, "type": "STRIPE", "number": 9, "inPocket": false, "color": "#ffff00"},
    {"id": 10, "x": 680, "y": 140, "vx": 0, "vy": 0, "type": "STRIPE", "number": 10, "inPocket": false, "color": "#0000ff"},
    {"id": 11, "x": 680, "y": 170, "vx": 0, "vy": 0, "type": "STRIPE", "number": 11, "inPocket": false, "color": "#ff0000"},
    {"id": 12, "x": 680, "y": 200, "vx": 0, "vy": 0, "type": "STRIPE", "number": 12, "inPocket": false, "color": "#800080"},
    {"id": 13, "x": 680, "y": 230, "vx": 0, "vy": 0, "type": "STRIPE", "number": 13, "inPocket": false, "color": "#ff6600"},
    {"id": 14, "x": 680, "y": 260, "vx": 0, "vy": 0, "type": "STRIPE", "number": 14, "inPocket": false, "color": "#00aa00"},
    {"id": 15, "x": 700, "y": 200, "vx": 0, "vy": 0, "type": "STRIPE", "number": 15, "inPocket": false, "color": "#660066"}
  ]'::jsonb;

  -- Update match with initial game state
  UPDATE pool_matches 
  SET game_state = jsonb_build_object(
    'balls', default_balls,
    'phase', 'BREAK',
    'currentPlayer', 1,
    'ballInHand', false,
    'gameType', '8BALL'
  )
  WHERE id = match_id_param 
    AND (game_state IS NULL OR game_state = '{}'::jsonb);
    
END;
$function$;

-- Fix set_opponent_on_second_join function
CREATE OR REPLACE FUNCTION public.set_opponent_on_second_join()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- If players array has exactly 2 players and opponent_user_id is null, set it
  IF jsonb_array_length(NEW.players) = 2 AND NEW.opponent_user_id IS NULL THEN
    -- Get the user_id of the second player (not the creator)
    SELECT (p->>'userId')::uuid INTO NEW.opponent_user_id
    FROM jsonb_array_elements(NEW.players) AS p
    WHERE (p->>'userId')::uuid != NEW.creator_user_id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create new log_security_event function with secure search path
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  table_name text,
  event_data jsonb DEFAULT '{}'::jsonb,
  user_id_param uuid DEFAULT auth.uid(),
  ip_address_param inet DEFAULT inet_client_addr()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.audit_logs (
    operation,
    table_name,
    user_id,
    ip_address,
    new_values,
    timestamp
  ) VALUES (
    event_type,
    table_name,
    user_id_param,
    ip_address_param,
    event_data,
    now()
  );
END;
$function$;

-- Create security_monitor_trigger function for automated threat detection
CREATE OR REPLACE FUNCTION public.security_monitor_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  current_ip inet;
  recent_count integer;
BEGIN
  current_ip := inet_client_addr();
  
  -- Check for suspicious rapid operations from same IP
  SELECT COUNT(*) INTO recent_count
  FROM public.audit_logs
  WHERE ip_address = current_ip
    AND timestamp > (now() - interval '5 minutes')
    AND operation IN ('INSERT', 'UPDATE', 'DELETE');
  
  -- Log suspicious activity (more than 50 operations in 5 minutes)
  IF recent_count > 50 THEN
    PERFORM log_security_event(
      'SUSPICIOUS_ACTIVITY_DETECTED',
      TG_TABLE_NAME,
      jsonb_build_object(
        'ip_address', current_ip,
        'operation_count', recent_count,
        'time_window', '5 minutes'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create emergency_security_lockdown function
CREATE OR REPLACE FUNCTION public.emergency_security_lockdown(
  reason text DEFAULT 'Emergency lockdown activated'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- Block all new user registrations temporarily
  -- This would require additional implementation based on your auth flow
  
  -- Log the lockdown event
  PERFORM log_security_event(
    'EMERGENCY_LOCKDOWN',
    'system',
    jsonb_build_object('reason', reason, 'activated_by', auth.uid())
  );
  
  -- You could add additional lockdown measures here:
  -- - Disable certain features
  -- - Increase rate limiting
  -- - Send alerts to admins
END;
$function$;
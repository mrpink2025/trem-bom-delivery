-- Phase 1: Critical RLS Policy Hardening
-- Fix overly permissive "System can manage" policies with proper system authentication

-- Create system authentication function
CREATE OR REPLACE FUNCTION public.is_system_operation()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the current role is a system service account
  -- This should be called from Edge Functions with service role key
  RETURN current_setting('role') = 'service_role' OR 
         current_setting('role') = 'supabase_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Update chat_rooms system policy to be more restrictive
DROP POLICY IF EXISTS "System can manage chat rooms" ON public.chat_rooms;
CREATE POLICY "System can manage chat rooms" ON public.chat_rooms
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Update courier_active_orders system policy
DROP POLICY IF EXISTS "System can manage courier active orders" ON public.courier_active_orders;
CREATE POLICY "System can manage courier active orders" ON public.courier_active_orders
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Update courier_earnings system policy  
DROP POLICY IF EXISTS "System can manage earnings" ON public.courier_earnings;
CREATE POLICY "System can manage earnings" ON public.courier_earnings
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Update courier_locations system policy
DROP POLICY IF EXISTS "System can manage courier locations" ON public.courier_locations;
CREATE POLICY "System can manage courier locations" ON public.courier_locations
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Update courier_sessions system policy
DROP POLICY IF EXISTS "System can manage courier sessions" ON public.courier_sessions;
CREATE POLICY "System can manage courier sessions" ON public.courier_sessions
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Update dispatch_offers system policy
DROP POLICY IF EXISTS "System can manage dispatch offers" ON public.dispatch_offers;
CREATE POLICY "System can manage dispatch offers" ON public.dispatch_offers
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Update loyalty_points system policy
DROP POLICY IF EXISTS "System can manage loyalty points" ON public.loyalty_points;
CREATE POLICY "System can manage loyalty points" ON public.loyalty_points
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Update device_sessions system policy
DROP POLICY IF EXISTS "System can manage device sessions" ON public.device_sessions;
CREATE POLICY "System can manage device sessions" ON public.device_sessions
FOR ALL 
USING (is_system_operation())
WITH CHECK (is_system_operation());

-- Add input validation function for critical operations
CREATE OR REPLACE FUNCTION public.validate_uuid_input(input_uuid text)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Add enhanced audit logging for system operations
CREATE OR REPLACE FUNCTION public.log_system_operation(
  operation_type text,
  table_name text,
  record_id uuid DEFAULT NULL,
  additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (
    operation,
    table_name,
    record_id,
    user_id,
    new_values,
    timestamp
  ) VALUES (
    'SYSTEM_' || operation_type,
    table_name,
    record_id,
    NULL, -- System operations don't have a user_id
    additional_data,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Create function to validate system operations and log them
CREATE OR REPLACE FUNCTION public.secure_system_operation(
  operation_type text,
  target_table text,
  target_id uuid DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate that this is indeed a system operation
  IF NOT is_system_operation() THEN
    RAISE EXCEPTION 'Unauthorized system operation attempt: %', operation_type;
  END IF;
  
  -- Log the system operation
  PERFORM log_system_operation(operation_type, target_table, target_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Add rate limiting function for security-sensitive operations
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  operation_key text,
  max_attempts integer DEFAULT 5,
  window_minutes integer DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count recent attempts for this operation
  SELECT COUNT(*) INTO attempt_count
  FROM public.audit_logs
  WHERE operation = operation_key
    AND user_id = auth.uid()
    AND timestamp > (now() - interval '1 minute' * window_minutes);
  
  -- Return false if rate limit exceeded
  IF attempt_count >= max_attempts THEN
    -- Log the rate limit violation
    PERFORM log_security_event(
      'RATE_LIMIT_EXCEEDED',
      'audit_logs',
      jsonb_build_object(
        'operation', operation_key,
        'attempts', attempt_count,
        'user_id', auth.uid()
      )
    );
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Log this security hardening action
SELECT log_security_event(
  'SECURITY_HARDENING_PHASE_1',
  'system',
  jsonb_build_object(
    'action', 'RLS_POLICY_HARDENING_AND_FUNCTION_SECURITY',
    'policies_updated', 8,
    'functions_created', 4,
    'system_auth_implemented', true
  )
);
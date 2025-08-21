-- SECURITY FIX: Prevent privilege escalation by restricting role updates
-- Drop the existing policy that allows users to update their own profile without restrictions
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a new policy that allows profile updates but excludes the role field
CREATE POLICY "Users can update own profile except role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND OLD.role = NEW.role -- Prevent role changes by regular users
);

-- Create admin-only role management function
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role user_role
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  -- Update the target user's role
  UPDATE public.profiles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the role change for audit purposes
  INSERT INTO public.audit_logs (
    table_name, record_id, operation, 
    old_values, new_values, user_id
  ) VALUES (
    'profiles', target_user_id, 'ROLE_CHANGE',
    jsonb_build_object('old_role', (
      SELECT role FROM public.profiles WHERE user_id = target_user_id
    )),
    jsonb_build_object('new_role', new_role),
    auth.uid()
  );
  
  RETURN TRUE;
END;
$$;

-- Create security audit function to detect suspicious activities
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  severity TEXT DEFAULT 'medium',
  description TEXT DEFAULT NULL,
  user_id_param UUID DEFAULT NULL,
  metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    table_name, operation, user_id, 
    new_values, ip_address
  ) VALUES (
    'security_events', event_type, 
    COALESCE(user_id_param, auth.uid()),
    jsonb_build_object(
      'severity', severity,
      'description', description,
      'metadata', metadata,
      'timestamp', now()
    ),
    inet_client_addr()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Add trigger to detect and log suspicious profile update attempts
CREATE OR REPLACE FUNCTION public.detect_profile_security_violations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Detect role change attempts by non-admins
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Check if user is admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      -- Log security violation
      PERFORM public.log_security_event(
        'UNAUTHORIZED_ROLE_CHANGE_ATTEMPT',
        'high',
        'User attempted to change role without admin privileges',
        NEW.user_id,
        jsonb_build_object(
          'attempted_role', NEW.role,
          'current_role', OLD.role,
          'actor_id', auth.uid()
        )
      );
      
      -- Prevent the change
      RAISE EXCEPTION 'Unauthorized role change attempt detected and logged';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile security monitoring
DROP TRIGGER IF EXISTS profile_security_monitor ON public.profiles;
CREATE TRIGGER profile_security_monitor
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_profile_security_violations();

-- Create blocked IPs table for security
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on blocked IPs
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked IPs
CREATE POLICY "Only admins can manage blocked IPs"
ON public.blocked_ips
FOR ALL
USING (has_role('admin'));

-- Create security events table for better tracking
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Only admins can view security events"
ON public.security_events
FOR SELECT
USING (has_role('admin'));

-- System can insert security events
CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);
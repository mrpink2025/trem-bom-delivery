-- SECURITY FIX: Prevent privilege escalation by restricting role updates
-- Drop the existing policy that allows users to update their own profile without restrictions
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create separate policies for different profile field updates
CREATE POLICY "Users can update own profile basic fields" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
    jsonb_build_object('target_user', target_user_id),
    jsonb_build_object('new_role', new_role),
    auth.uid()
  );
  
  RETURN TRUE;
END;
$$;

-- Add trigger to prevent role field updates through regular UPDATE operations
CREATE OR REPLACE FUNCTION public.prevent_role_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Allow role changes only if user is admin or it's the initial insert
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    -- Get current user's role
    SELECT role INTO current_user_role 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    -- Block role changes for non-admins
    IF current_user_role != 'admin' THEN
      -- Log security violation attempt
      INSERT INTO public.audit_logs (
        table_name, record_id, operation, 
        old_values, new_values, user_id, ip_address
      ) VALUES (
        'profiles', NEW.user_id, 'UNAUTHORIZED_ROLE_CHANGE_ATTEMPT',
        jsonb_build_object('old_role', OLD.role, 'attempted_role', NEW.role),
        jsonb_build_object('blocked', true, 'actor_id', auth.uid()),
        auth.uid(),
        inet_client_addr()
      );
      
      -- Reset role to original value
      NEW.role := OLD.role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to prevent unauthorized role updates
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_updates();

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

-- Create blocked IPs table for security
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on blocked IPs
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked IPs
CREATE POLICY "Only admins can manage blocked IPs"
ON public.blocked_ips
FOR ALL
USING (has_role('admin'));
-- Fix function search path issue
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(user_id uuid, full_name text, role user_role)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT profiles.user_id, profiles.full_name, profiles.role 
  FROM public.profiles 
  WHERE profiles.user_id = auth.uid();
$$;
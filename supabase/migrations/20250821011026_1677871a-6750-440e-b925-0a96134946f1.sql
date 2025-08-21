-- Fix security warnings for functions with mutable search paths
-- Update get_file_url function with proper search_path
CREATE OR REPLACE FUNCTION public.get_file_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN bucket_name IN ('avatars', 'restaurants', 'menu-items') THEN
      'https://ighllleypgbkluhcihvs.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path
    ELSE
      'https://ighllleypgbkluhcihvs.supabase.co/storage/v1/object/sign/' || bucket_name || '/' || file_path
  END;
$$;

-- Update get_current_user_role function with proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Update get_current_user_profile function with proper search_path  
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(user_id uuid, full_name text, role user_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profiles.user_id, profiles.full_name, profiles.role 
  FROM public.profiles 
  WHERE profiles.user_id = auth.uid();
$$;

-- Update has_role function with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = required_role
  );
$$;
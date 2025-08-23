-- CRITICAL SECURITY FIXES: Database Function Hardening
-- Fix search path manipulation vulnerabilities by adding SET search_path TO 'public'

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.has_admin_role(admin_role);
DROP FUNCTION IF EXISTS public.has_role(user_role);
DROP FUNCTION IF EXISTS public.apply_psychological_rounding(numeric, text);

-- Create apply_psychological_rounding function with security hardening
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(
  base_price NUMERIC,
  rounding_type TEXT DEFAULT 'NEAREST_TENTH'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  CASE rounding_type
    WHEN 'NEAREST_TENTH' THEN
      RETURN ROUND(base_price * 10) / 10.0;
    WHEN 'PSYCHOLOGICAL_99' THEN
      RETURN FLOOR(base_price) + 0.99;
    WHEN 'NEAREST_HALF' THEN
      RETURN ROUND(base_price * 2) / 2.0;
    WHEN 'EXACT' THEN
      RETURN base_price;
    ELSE
      RETURN ROUND(base_price * 10) / 10.0;
  END CASE;
END;
$function$;

-- Create security function to check user role with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::TEXT FROM profiles WHERE user_id = auth.uid();
$$;

-- Create security function to check admin role with proper search path  
CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND (role = required_role OR role = 'SUPERADMIN'::admin_role)
  );
$$;

-- Create security function to check user role with proper search path
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL  
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = required_role
  );
$$;

-- Enhance storage security with comprehensive RLS policies for existing buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create policies for avatar bucket
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
);

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
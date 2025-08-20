-- Fix security issue by recreating function with proper search_path
-- Step 1: Drop dependent policies first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;  
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

-- Step 2: Now drop and recreate the function with secure search_path
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE 
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 3: Recreate the policies
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all orders" 
ON public.orders 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');
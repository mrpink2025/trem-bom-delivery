-- Fix infinite recursion in profiles RLS policies by creating security definer function
-- Drop problematic recursive policies first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

-- Create security definer function to get user role without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate admin policies using the security definer function to avoid recursion
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
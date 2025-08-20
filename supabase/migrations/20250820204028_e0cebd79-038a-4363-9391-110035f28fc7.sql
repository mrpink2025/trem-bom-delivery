-- Fix infinite recursion in profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new, non-recursive policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a simple admin policy that doesn't reference profiles table
CREATE POLICY "Service role can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'service_role');

-- Also fix similar issues in other tables that reference profiles
DROP POLICY IF EXISTS "Admins can view all restaurants" ON public.restaurants;
CREATE POLICY "Anyone can view active restaurants" 
ON public.restaurants 
FOR SELECT 
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
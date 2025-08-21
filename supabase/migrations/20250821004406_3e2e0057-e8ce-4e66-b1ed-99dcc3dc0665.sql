-- First, let's check and fix the role system properly

-- Add seller to existing enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'seller') THEN
        ALTER TYPE user_role ADD VALUE 'seller';
    END IF;
END $$;

-- Create security definer functions (updated to work with existing structure)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = required_role
  );
$$;

-- Drop existing order policies to recreate them with better security
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Couriers can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Couriers can view available orders" ON public.orders;
DROP POLICY IF EXISTS "Couriers can accept orders" ON public.orders;
DROP POLICY IF EXISTS "Couriers can update their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Restaurant owners can update their orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
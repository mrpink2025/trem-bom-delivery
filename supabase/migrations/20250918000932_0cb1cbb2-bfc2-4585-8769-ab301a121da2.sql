-- Fix user registration system

-- 1. Create the missing trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the user
  INSERT INTO public.profiles (
    user_id,
    full_name,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'user'::user_role
  );
  
  RETURN NEW;
END;
$$;

-- 2. Create the missing trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix RLS policies to avoid infinite recursion
-- Drop the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a simpler admin policy that doesn't cause recursion
-- Admins will be identified by a direct check instead of using get_current_user_role()
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT 
  USING (
    -- Allow users to see their own profile
    auth.uid() = user_id 
    OR 
    -- Allow admins (check admin_users table directly)
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- 4. Ensure all existing users have profiles
-- Insert profiles for any auth.users that don't have a profile yet
INSERT INTO public.profiles (user_id, full_name, role)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.email, 'User'),
  'user'::user_role
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- 5. Update the get_current_user_role function to be more robust
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'user'::user_role
  );
$$;
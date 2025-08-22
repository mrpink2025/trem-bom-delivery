-- Make artur2024junior@gmail.com a superadmin
INSERT INTO public.admin_users (user_id, role, created_by)
SELECT 
  au.id,
  'SUPERADMIN'::admin_role,
  au.id
FROM auth.users au
WHERE au.email = 'artur2024junior@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE user_id = au.id
);
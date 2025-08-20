-- Promover artur2024junior@gmail.com a administrador
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'artur2024junior@gmail.com'
);
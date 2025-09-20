-- Update the handle_new_user function to include all registration fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the user with all registration data
  INSERT INTO public.profiles (
    user_id,
    full_name,
    role,
    phone,
    cpf,
    phone_verified
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'client'::user_role,
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'cpf',
    COALESCE((NEW.raw_user_meta_data ->> 'phone_verified')::boolean, false)
  );
  
  RETURN NEW;
END;
$$;
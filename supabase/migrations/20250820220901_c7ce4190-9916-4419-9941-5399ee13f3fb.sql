-- Update the handle_new_user function to include CPF and phone from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, cpf, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'),
    COALESCE(NEW.raw_user_meta_data ->> 'cpf', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL)
  );
  RETURN NEW;
END;
$$;
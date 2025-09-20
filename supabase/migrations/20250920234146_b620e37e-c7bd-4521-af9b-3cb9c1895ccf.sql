-- Update handle_new_user function to be more robust and handle current frontend data structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the user with flexible data extraction
  INSERT INTO public.profiles (
    user_id,
    full_name,
    role,
    phone,
    cpf,
    phone_verified
  ) VALUES (
    NEW.id,
    -- Try multiple sources for full_name
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'fullName', 
      NEW.email
    ),
    'client'::user_role,
    -- Try multiple sources for phone
    COALESCE(
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'phone_number'
    ),
    -- Try multiple sources for CPF
    NEW.raw_user_meta_data ->> 'cpf',
    -- Phone verified status with fallback
    COALESCE(
      (NEW.raw_user_meta_data ->> 'phone_verified')::boolean,
      (NEW.raw_user_meta_data ->> 'phoneVerified')::boolean,
      false
    )
  );
  
  RETURN NEW;
END;
$$;
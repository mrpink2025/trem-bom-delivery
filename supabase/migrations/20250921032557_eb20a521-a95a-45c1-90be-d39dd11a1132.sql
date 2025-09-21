-- Fix handle_new_user function with proper CPF sanitization and role validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sanitized_cpf text;
  validated_role user_role;
BEGIN
  -- Sanitize CPF: remove all non-digits and validate length
  sanitized_cpf := regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'cpf', ''), '[^0-9]', '', 'g');
  IF length(sanitized_cpf) != 11 THEN
    sanitized_cpf := NULL;
  END IF;

  -- Validate role against enum values
  BEGIN
    validated_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'::user_role);
  EXCEPTION WHEN invalid_text_representation THEN
    validated_role := 'client'::user_role;
  END;

  -- Log the attempt for debugging
  RAISE LOG 'Creating profile for user %: cpf=%, role=%', 
    NEW.id, 
    COALESCE(sanitized_cpf, 'NULL'), 
    validated_role;

  INSERT INTO public.profiles (
    user_id,
    full_name,
    role,
    phone,
    cpf,
    phone_verified
  ) VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'fullName',
      NEW.email
    ),
    validated_role,
    COALESCE(
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'phone_number'
    ),
    sanitized_cpf,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'phone_verified')::boolean,
      (NEW.raw_user_meta_data ->> 'phoneVerified')::boolean,
      false
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    phone = EXCLUDED.phone,
    cpf = EXCLUDED.cpf,
    phone_verified = EXCLUDED.phone_verified,
    updated_at = now();

  RAISE LOG 'Successfully created/updated profile for user %', NEW.id;
  
  RETURN NEW;
END;
$$;
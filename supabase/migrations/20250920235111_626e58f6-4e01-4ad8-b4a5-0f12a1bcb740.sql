-- Ensure robust profile creation on signup
-- 1) Upsert profile with conflict on user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'client'::user_role
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'phone_number'
    ),
    NEW.raw_user_meta_data ->> 'cpf',
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

  RETURN NEW;
END;
$$;

-- 2) Create the trigger to run after a new auth user is inserted
DO $$
BEGIN
  -- Drop if it exists to avoid duplicates
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
  ) THEN
    EXECUTE 'DROP TRIGGER on_auth_user_created ON auth.users';
  END IF;

  EXECUTE 'CREATE TRIGGER on_auth_user_created
           AFTER INSERT ON auth.users
           FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()';
END$$;
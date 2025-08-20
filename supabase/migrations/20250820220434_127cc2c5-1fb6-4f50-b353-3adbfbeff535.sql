-- Add CPF field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cpf text;

-- Add phone number field if it doesn't exist (checking the schema it seems to exist already)
-- ALTER TABLE public.profiles 
-- ADD COLUMN phone text; -- This already exists

-- Create index for CPF for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);

-- Add constraint to ensure CPF format (11 digits)
ALTER TABLE public.profiles 
ADD CONSTRAINT check_cpf_format 
CHECK (cpf IS NULL OR (cpf ~ '^[0-9]{11}$'));

COMMENT ON COLUMN public.profiles.cpf IS 'CPF do usuário (somente números, 11 dígitos)';
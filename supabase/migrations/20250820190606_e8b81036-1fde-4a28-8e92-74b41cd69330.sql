-- Drop the previous view and create a simpler solution
DROP VIEW IF EXISTS public.restaurants_public;

-- Revert to original policy but more secure
CREATE POLICY "Anyone can view active restaurants" 
ON public.restaurants 
FOR SELECT 
USING (is_active = true);

-- Add more secure configuration for auth
UPDATE auth.config SET 
  security_captcha_enabled = true,
  security_captcha_provider = 'hcaptcha'
WHERE true;
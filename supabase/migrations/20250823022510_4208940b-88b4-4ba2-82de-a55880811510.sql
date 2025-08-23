-- Fix search_path for security functions that were already created
-- Update the apply_psychological_rounding function to have secure search_path
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(price numeric, rounding_type text DEFAULT 'NONE'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  CASE rounding_type
    WHEN 'NONE' THEN
      RETURN price;
    WHEN 'ROUND_UP' THEN
      RETURN ceil(price);
    WHEN 'ROUND_DOWN' THEN
      RETURN floor(price);
    WHEN 'PSYCHOLOGICAL' THEN
      -- Round to .99 endings (psychological pricing)
      IF price < 10 THEN
        RETURN floor(price) + 0.99;
      ELSIF price < 100 THEN
        RETURN floor(price / 10) * 10 + 9.99;
      ELSE
        RETURN floor(price / 100) * 100 + 99.99;
      END IF;
    ELSE
      RETURN price;
  END CASE;
END;
$function$;
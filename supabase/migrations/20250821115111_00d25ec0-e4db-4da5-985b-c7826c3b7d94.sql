-- Fix get_current_user_role function to ensure it works correctly
DROP FUNCTION IF EXISTS public.get_current_user_role();

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN NULL
      ELSE (
        SELECT role 
        FROM public.profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    END;
$function$;
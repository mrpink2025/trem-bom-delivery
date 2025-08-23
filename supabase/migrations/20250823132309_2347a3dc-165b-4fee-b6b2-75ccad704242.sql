-- Security Fix Part 1: Fix existing function and add search_path to critical functions
-- Drop and recreate apply_psychological_rounding function
DROP FUNCTION IF EXISTS public.apply_psychological_rounding(numeric, text);

CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(
  p_price NUMERIC,
  p_rounding_type TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  CASE p_rounding_type
    WHEN 'UP_99' THEN
      RETURN FLOOR(p_price) + 0.99;
    WHEN 'UP_95' THEN
      RETURN FLOOR(p_price) + 0.95;
    WHEN 'NEAREST_50' THEN
      RETURN FLOOR(p_price) + 
        CASE 
          WHEN (p_price - FLOOR(p_price)) <= 0.50 THEN 0.50
          ELSE 1.00
        END;
    WHEN 'UP_INTEGER' THEN
      RETURN CEIL(p_price);
    ELSE
      RETURN ROUND(p_price, 2);
  END CASE;
END;
$function$;

-- Create security definer functions for role checking to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.has_role(p_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE  
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = p_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_admin_role(p_role admin_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND role = p_role
  );
$function$;

-- Fix cleanup_old_tracking_data function
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  UPDATE chat_messages 
  SET media_url = NULL,
      content = CASE 
        WHEN message_type = 'image' THEN '[Imagem removida - retenção expirada]'
        WHEN message_type = 'audio' THEN '[Áudio removido - retenção expirada]'
        ELSE content 
      END
  WHERE created_at < (now() - interval '90 days')
    AND media_url IS NOT NULL;
    
  INSERT INTO audit_logs (
    table_name, operation, new_values, user_id
  ) VALUES (
    'system_cleanup', 'DATA_RETENTION_CLEANUP', 
    jsonb_build_object(
      'cleanup_date', now(),
      'tracking_retention_days', 30,
      'chat_media_retention_days', 90
    ),
    '00000000-0000-0000-0000-000000000000'
  );
END;
$function$;
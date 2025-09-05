-- Phase 1: Critical Database Security Fixes (Final)

-- 1. Fix Database Function Security - Add proper search_path to prevent SQL injection
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Deletar tracking points mais antigos que 30 dias
  DELETE FROM public.delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  -- Deletar mensagens de chat mais antigas que 90 dias (apenas mídia, manter texto)
  UPDATE public.chat_messages 
  SET media_url = NULL,
      content = CASE 
        WHEN message_type = 'image' THEN '[Imagem removida - retenção expirada]'
        WHEN message_type = 'audio' THEN '[Áudio removido - retenção expirada]'
        ELSE content 
      END
  WHERE created_at < (now() - interval '90 days')
    AND media_url IS NOT NULL;
    
  -- Log da limpeza
  INSERT INTO public.audit_logs (
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

-- 2. Update ensure_single_default_address function  
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Se o novo endereço está sendo marcado como padrão
  IF NEW.is_default = true THEN
    -- Remove o padrão de todos os outros endereços do mesmo usuário
    UPDATE public.user_addresses 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Create missing psychological rounding function for pricing security
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(amount numeric, rounding_type text DEFAULT 'ROUND_UP_99')
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  CASE rounding_type
    WHEN 'ROUND_UP_99' THEN
      -- Round up to nearest .99 (e.g., 15.23 -> 15.99)
      RETURN FLOOR(amount) + 0.99;
    WHEN 'ROUND_UP_95' THEN  
      -- Round up to nearest .95 (e.g., 15.23 -> 15.95)
      RETURN FLOOR(amount) + 0.95;
    WHEN 'ROUND_UP_50' THEN
      -- Round up to nearest .50 (e.g., 15.23 -> 15.50)
      RETURN FLOOR(amount) + 0.50;
    WHEN 'ROUND_NEAREST' THEN
      -- Standard rounding to nearest integer
      RETURN ROUND(amount);
    ELSE
      -- Default: return original amount
      RETURN amount;
  END CASE;
END;
$function$;

-- 4. Add security audit log for database fixes
INSERT INTO public.audit_logs (
  table_name, operation, new_values, user_id
) VALUES (
  'system_security', 'CRITICAL_DATABASE_SECURITY_FIXES', 
  jsonb_build_object(
    'fixes_applied', ARRAY[
      'fixed_function_search_paths', 
      'security_definer_hardening',
      'added_psychological_rounding_function'
    ],
    'applied_at', now(),
    'severity', 'CRITICAL',
    'next_steps', ARRAY[
      'clean_migration_secrets',
      'harden_auth_configuration', 
      'implement_csp_headers'
    ]
  ),
  '00000000-0000-0000-0000-000000000000'
);
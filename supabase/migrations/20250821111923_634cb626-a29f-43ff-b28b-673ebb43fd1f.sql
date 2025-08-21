-- =====================================================
-- 🔒 CORREÇÕES DE SEGURANÇA: Security Linter Issues (Corrigido)
-- =====================================================

-- 1. Corrigir search_path em funções críticas (SECURITY)
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_profile() SET search_path = 'public';
ALTER FUNCTION public.has_role(user_role) SET search_path = 'public';
ALTER FUNCTION public.get_file_url(text, text) SET search_path = 'public';

-- 2. Melhorar função de cleanup com search_path correto
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Deletar tracking points mais antigos que 30 dias
  DELETE FROM public.delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  -- Deletar mensagens de chat mais antigas que 90 dias (apenas mídia, manter texto)
  UPDATE public.messages 
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
$$;

-- 3. Função para validar configurações de segurança
CREATE OR REPLACE FUNCTION public.validate_security_config()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar RLS habilitado em tabelas críticas
  RETURN QUERY
  SELECT 
    'Row Level Security'::TEXT,
    CASE WHEN (
      SELECT COUNT(*) FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public' 
      AND NOT c.relrowsecurity
      AND t.tablename IN ('orders', 'payments', 'profiles', 'messages')
    ) = 0 THEN 'OK' ELSE 'CRITICAL' END::TEXT,
    'All sensitive tables have RLS enabled'::TEXT;
    
  -- Verificar configurações gerais
  RETURN QUERY
  SELECT 
    'Security Configuration'::TEXT,
    'WARN'::TEXT,
    'Review OTP expiry and password protection settings in Supabase Auth dashboard'::TEXT;
END;
$$;

-- 4. Política adicional para auditoria de segurança
CREATE POLICY "Admins can view security validation" ON public.audit_logs
FOR SELECT 
USING (
  get_current_user_role() = 'admin'::user_role 
  AND operation IN ('SECURITY_VALIDATION', 'DATA_RETENTION_CLEANUP')
);

-- 5. Índices simples para otimizar cleanup (sem predicado com now())
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_timestamp_cleanup 
ON public.delivery_tracking (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_created_media_cleanup
ON public.messages (created_at DESC, media_url) 
WHERE media_url IS NOT NULL;
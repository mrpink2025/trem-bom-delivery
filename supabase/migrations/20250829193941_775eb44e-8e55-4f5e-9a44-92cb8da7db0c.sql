-- Corrigir funções de segurança crítica adicionando search_path
-- Função para verificar roles de admin
CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN exists(
    select 1 from admin_users 
    where user_id = auth.uid() 
    and role = required_role
  );
END;
$$;

-- Função para verificar roles de usuário
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN exists(
    select 1 from profiles 
    where user_id = auth.uid() 
    and role = required_role
  );
END;
$$;

-- Função para obter role do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

-- Função para arredondamento psicológico de preços
CREATE OR REPLACE FUNCTION public.apply_psychological_rounding(price numeric, rounding_type text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  CASE rounding_type
    WHEN 'ROUND_99' THEN
      RETURN floor(price) + 0.99;
    WHEN 'ROUND_90' THEN
      RETURN floor(price) + 0.90;
    WHEN 'ROUND_UP' THEN
      RETURN ceil(price);
    WHEN 'ROUND_DOWN' THEN
      RETURN floor(price);
    ELSE
      RETURN round(price, 2);
  END CASE;
END;
$$;

-- Correção da função de limpeza de dados
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Deletar tracking points mais antigos que 30 dias
  DELETE FROM delivery_tracking
  WHERE timestamp < (now() - interval '30 days');
  
  -- Deletar mensagens de chat mais antigas que 90 dias (apenas mídia, manter texto)
  UPDATE chat_messages 
  SET media_url = NULL,
      content = CASE 
        WHEN message_type = 'image' THEN '[Imagem removida - retenção expirada]'
        WHEN message_type = 'audio' THEN '[Áudio removido - retenção expirada]'
        ELSE content 
      END
  WHERE created_at < (now() - interval '90 days')
    AND media_url IS NOT NULL;
    
  -- Log da limpeza
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
$$;
-- CONTINUAÇÃO DAS CORREÇÕES DE SEGURANÇA
-- Corrigir funções adicionais e implementar melhorias de segurança

-- 1. Corrigir a função de pricing dinâmico que pode estar vulnerável
CREATE OR REPLACE FUNCTION public.calculate_dynamic_pricing(p_restaurant_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_config RECORD;
  v_item JSONB;
  v_rule RECORD;
  v_base_price NUMERIC;
  v_markup_delta NUMERIC;
  v_item_final_price NUMERIC;
  v_subtotal NUMERIC := 0;
  v_base_total NUMERIC := 0;
  v_final_total NUMERIC;
  v_steps JSONB := '[]'::JSONB;
  v_items_result JSONB := '[]'::JSONB;
  v_step JSONB;
BEGIN
  -- Buscar configuração da loja
  SELECT * INTO v_config 
  FROM markup_configurations 
  WHERE restaurant_id = p_restaurant_id AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Markup configuration not found for restaurant %', p_restaurant_id;
  END IF;
  
  -- Processar cada item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_base_price := (v_item->>'base_price')::NUMERIC;
    v_base_total := v_base_total + (v_base_price * (v_item->>'quantity')::INTEGER);
    
    -- Encontrar regra vencedora
    SELECT * INTO v_rule
    FROM markup_rules mr
    WHERE mr.restaurant_id = p_restaurant_id
      AND mr.is_active = true
      AND (mr.valid_until IS NULL OR mr.valid_until > now())
      AND (
        (mr.rule_type = 'PRODUCT' AND mr.target_id = (v_item->>'menu_item_id')::UUID) OR
        (mr.rule_type = 'CATEGORY' AND mr.target_id = (v_item->>'category_id')::UUID) OR
        (mr.rule_type = 'STORE' AND mr.target_id IS NULL)
      )
    ORDER BY 
      CASE mr.rule_type 
        WHEN 'PRODUCT' THEN 1
        WHEN 'CATEGORY' THEN 2  
        WHEN 'STORE' THEN 3
      END,
      mr.priority ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
      v_markup_delta := 0;
    ELSE
      IF v_rule.margin_type = 'PERCENT' THEN
        v_markup_delta := v_base_price * (v_rule.margin_value / 100.0);
      ELSE
        v_markup_delta := v_rule.margin_value;
      END IF;
      
      -- Aplicar tetos
      IF v_config.max_item_increase_percent IS NOT NULL THEN
        v_markup_delta := LEAST(v_markup_delta, v_base_price * (v_config.max_item_increase_percent / 100.0));
      END IF;
      
      IF v_config.max_markup_amount IS NOT NULL THEN
        v_markup_delta := LEAST(v_markup_delta, v_config.max_markup_amount);
      END IF;
    END IF;
    
    v_item_final_price := v_base_price + v_markup_delta;
    v_subtotal := v_subtotal + (v_item_final_price * (v_item->>'quantity')::INTEGER);
    
    v_items_result := v_items_result || jsonb_build_object(
      'menu_item_id', v_item->>'menu_item_id',
      'quantity', (v_item->>'quantity')::INTEGER,
      'base_price', v_base_price,
      'markup_delta', v_markup_delta,
      'final_price', v_item_final_price,
      'rule_applied', COALESCE(row_to_json(v_rule), 'null'::JSON)
    );
  END LOOP;
  
  v_final_total := v_subtotal;
  
  -- Cobertura de taxa de pagamento
  IF v_config.cover_payment_fees THEN
    v_final_total := (v_subtotal + v_config.payment_fee_fixed) / (1 - v_config.payment_fee_rate);
  END IF;
  
  -- Taxa de serviço
  IF v_config.service_fee_percent > 0 THEN
    v_final_total := v_final_total * (1 + v_config.service_fee_percent / 100.0);
  END IF;
  
  RETURN jsonb_build_object(
    'items', v_items_result,
    'base_total', v_base_total,
    'subtotal_after_markup', v_subtotal,
    'final_total', v_final_total,
    'config_used', row_to_json(v_config),
    'timestamp', now()
  );
END;
$$;

-- 2. Criar função de auditoria de segurança aprimorada
CREATE OR REPLACE FUNCTION public.perform_security_audit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  audit_result jsonb;
  table_count integer;
  rls_enabled_count integer;
  function_count integer;
  insecure_functions text[];
BEGIN
  -- Verificar se é admin
  IF NOT has_role('admin'::user_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required for security audit';
  END IF;
  
  -- Contar tabelas públicas
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
  
  -- Contar tabelas com RLS habilitado
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relrowsecurity = true;
  
  -- Contar funções públicas
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';
  
  -- Construir resultado da auditoria
  audit_result := jsonb_build_object(
    'timestamp', now(),
    'audit_type', 'comprehensive_security_scan',
    'tables', jsonb_build_object(
      'total_public_tables', table_count,
      'rls_enabled_tables', rls_enabled_count,
      'rls_coverage_percent', CASE 
        WHEN table_count > 0 THEN round((rls_enabled_count::decimal / table_count) * 100, 2)
        ELSE 0
      END
    ),
    'functions', jsonb_build_object(
      'total_functions', function_count
    ),
    'security_score', CASE
      WHEN rls_enabled_count >= table_count THEN 'EXCELLENT'
      WHEN rls_enabled_count >= (table_count * 0.8) THEN 'GOOD' 
      WHEN rls_enabled_count >= (table_count * 0.5) THEN 'FAIR'
      ELSE 'POOR'
    END
  );
  
  -- Registrar auditoria
  PERFORM log_security_event(
    'SECURITY_AUDIT_COMPLETED',
    'system_audit',
    audit_result
  );
  
  RETURN audit_result;
END;
$$;

-- 3. Implementar sistema de bloqueio automático por IP suspeito
CREATE OR REPLACE FUNCTION public.auto_block_suspicious_ip(
  p_ip_address inet,
  p_reason text DEFAULT 'Automated threat detection'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_block record;
BEGIN
  -- Verificar se já está bloqueado
  SELECT * INTO existing_block
  FROM blocked_ips 
  WHERE ip_address = p_ip_address 
  AND is_active = true;
  
  IF FOUND THEN
    RETURN false; -- Já bloqueado
  END IF;
  
  -- Inserir novo bloqueio
  INSERT INTO blocked_ips (
    ip_address,
    reason,
    is_active,
    blocked_until,
    created_by
  ) VALUES (
    p_ip_address,
    p_reason,
    true,
    now() + interval '24 hours', -- Bloqueio de 24 horas
    '00000000-0000-0000-0000-000000000000' -- Sistema
  );
  
  -- Registrar evento de segurança
  PERFORM log_security_event(
    'AUTOMATIC_IP_BLOCK',
    'blocked_ips',
    jsonb_build_object(
      'ip_address', p_ip_address,
      'reason', p_reason,
      'blocked_until', now() + interval '24 hours'
    )
  );
  
  RETURN true;
END;
$$;

-- 4. Função para verificar IPs suspeitos baseado em tentativas de login
CREATE OR REPLACE FUNCTION public.check_and_block_suspicious_ips()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  suspicious_ip record;
  blocked_count integer := 0;
BEGIN
  -- Buscar IPs com muitas tentativas de login falhadas na última hora
  FOR suspicious_ip IN
    SELECT 
      ip_address,
      COUNT(*) as failed_attempts
    FROM audit_logs 
    WHERE 
      operation = 'SECURITY_VALIDATION'
      AND created_at > now() - interval '1 hour'
      AND new_values->>'event_type' LIKE '%FAILED_LOGIN%'
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    HAVING COUNT(*) >= 5 -- 5 ou mais tentativas falhadas
  LOOP
    -- Tentar bloquear IP suspeito
    IF auto_block_suspicious_ip(
      suspicious_ip.ip_address,
      'Automated block: ' || suspicious_ip.failed_attempts || ' failed login attempts in 1 hour'
    ) THEN
      blocked_count := blocked_count + 1;
    END IF;
  END LOOP;
  
  RETURN blocked_count;
END;
$$;

-- 5. Função para limpeza automática de bloqueios expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_ip_blocks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cleaned_count integer;
BEGIN
  -- Desativar bloqueios expirados
  UPDATE blocked_ips 
  SET is_active = false
  WHERE is_active = true
  AND blocked_until IS NOT NULL
  AND blocked_until < now();
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Registrar limpeza
  IF cleaned_count > 0 THEN
    PERFORM log_security_event(
      'EXPIRED_IP_BLOCKS_CLEANED',
      'blocked_ips',
      jsonb_build_object('cleaned_count', cleaned_count)
    );
  END IF;
  
  RETURN cleaned_count;
END;
$$;

-- 6. Registrar todas as correções aplicadas
INSERT INTO security_config (config_key, config_value, description)
VALUES 
('pricing_function_secured', '{"status": "secured"}'::jsonb, 'Dynamic pricing function secured with proper search_path'),
('security_audit_system', '{"status": "active"}'::jsonb, 'Comprehensive security audit system implemented'),
('auto_ip_blocking', '{"status": "active"}'::jsonb, 'Automatic IP blocking for suspicious activity'),
('ip_block_cleanup', '{"status": "active"}'::jsonb, 'Automatic cleanup of expired IP blocks')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  applied_at = now();
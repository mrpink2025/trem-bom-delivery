-- CORREÇÕES AVANÇADAS DE SEGURANÇA - Eliminar ERROR crítico de RLS
-- Identificar e corrigir tabelas sem RLS + implementar segurança avançada

-- 1. CRÍTICO: Habilitar RLS em todas as tabelas públicas que não têm
DO $$
DECLARE
    table_rec record;
    policy_count integer;
BEGIN
    -- Encontrar tabelas sem RLS habilitado
    FOR table_rec IN 
        SELECT t.table_name, c.relname, c.relrowsecurity
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false)
        AND t.table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP
        -- Habilitar RLS na tabela
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_rec.table_name);
            RAISE NOTICE 'RLS habilitado na tabela: %', table_rec.table_name;
            
            -- Verificar se a tabela já tem políticas
            SELECT COUNT(*) INTO policy_count
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = table_rec.table_name;
            
            -- Se não tem políticas, criar uma política restritiva padrão
            IF policy_count = 0 THEN
                EXECUTE format('CREATE POLICY "%s_security_policy" ON public.%I FOR ALL TO authenticated USING (false)', 
                              table_rec.table_name, table_rec.table_name);
                RAISE NOTICE 'Política de segurança padrão criada para: %', table_rec.table_name;
            END IF;
            
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Erro ao configurar RLS para %: %', table_rec.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. Criar sistema de monitoramento de segurança em tempo real
CREATE OR REPLACE FUNCTION public.real_time_security_monitor()
RETURNS TABLE(
    alert_level text,
    event_type text,
    description text,
    count integer,
    last_occurrence timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verificar se é admin
    IF NOT has_role('admin'::user_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    WITH security_events AS (
        -- IPs bloqueados ativos
        SELECT 
            'HIGH' as alert_level,
            'ACTIVE_IP_BLOCKS' as event_type,
            'IPs currently blocked for suspicious activity' as description,
            COUNT(*)::integer as count,
            MAX(blocked_at) as last_occurrence
        FROM blocked_ips 
        WHERE is_active = true
        
        UNION ALL
        
        -- Tentativas de login suspeitas na última hora
        SELECT 
            'MEDIUM' as alert_level,
            'SUSPICIOUS_LOGIN_ATTEMPTS' as event_type,
            'Failed login attempts in last hour' as description,
            COUNT(*)::integer as count,
            MAX(created_at) as last_occurrence
        FROM audit_logs 
        WHERE operation = 'SECURITY_VALIDATION'
        AND created_at > now() - interval '1 hour'
        AND new_values->>'event_type' LIKE '%FAILED%'
        
        UNION ALL
        
        -- Operações de delete suspeitas hoje
        SELECT 
            'LOW' as alert_level,
            'DELETE_OPERATIONS' as event_type,
            'Suspicious delete operations today' as description,
            COUNT(*)::integer as count,
            MAX(created_at) as last_occurrence
        FROM audit_logs 
        WHERE operation = 'DELETE'
        AND created_at > CURRENT_DATE
    )
    SELECT * FROM security_events 
    WHERE count > 0
    ORDER BY 
        CASE alert_level 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            ELSE 3 
        END,
        last_occurrence DESC;
END;
$$;

-- 3. Sistema de validação de integridade de dados
CREATE OR REPLACE FUNCTION public.validate_data_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    integrity_report jsonb := '{}';
    orphaned_count integer;
    inconsistent_count integer;
BEGIN
    -- Verificar se é admin
    IF NOT has_role('admin'::user_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Verificar orders órfãos (sem user_id válido)
    SELECT COUNT(*) INTO orphaned_count
    FROM orders o
    LEFT JOIN profiles p ON p.user_id = o.user_id
    WHERE p.user_id IS NULL;
    
    -- Verificar itens de carrinho inconsistentes
    SELECT COUNT(*) INTO inconsistent_count
    FROM cart_items ci
    LEFT JOIN menu_items mi ON mi.id = ci.menu_item_id
    WHERE mi.id IS NULL;
    
    -- Construir relatório
    integrity_report := jsonb_build_object(
        'timestamp', now(),
        'orphaned_orders', orphaned_count,
        'inconsistent_cart_items', inconsistent_count,
        'overall_status', CASE 
            WHEN orphaned_count = 0 AND inconsistent_count = 0 THEN 'HEALTHY'
            WHEN orphaned_count + inconsistent_count < 10 THEN 'MINOR_ISSUES'
            ELSE 'NEEDS_ATTENTION'
        END
    );
    
    -- Registrar verificação
    PERFORM log_security_event(
        'DATA_INTEGRITY_CHECK',
        'system_validation',
        integrity_report
    );
    
    RETURN integrity_report;
END;
$$;

-- 4. Sistema de limpeza automática de dados sensíveis
CREATE OR REPLACE FUNCTION public.sanitize_sensitive_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    cleaned_records integer := 0;
BEGIN
    -- Verificar se é admin
    IF NOT has_role('admin'::user_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Limpar dados de localização antigos (mais de 7 dias)
    DELETE FROM courier_locations 
    WHERE created_at < now() - interval '7 days';
    GET DIAGNOSTICS cleaned_records = ROW_COUNT;
    
    -- Limpar sessões de dispositivos antigas (mais de 30 dias)
    UPDATE device_sessions 
    SET user_agent = '[REDACTED]',
        ip_address = NULL
    WHERE last_seen < now() - interval '30 days'
    AND user_agent IS NOT NULL;
    
    -- Anonymizar dados em audit_logs muito antigos (mais de 90 dias)
    UPDATE audit_logs 
    SET ip_address = NULL,
        user_id = NULL
    WHERE created_at < now() - interval '90 days'
    AND (ip_address IS NOT NULL OR user_id IS NOT NULL);
    
    -- Registrar limpeza
    PERFORM log_security_event(
        'SENSITIVE_DATA_SANITIZED',
        'data_protection',
        jsonb_build_object(
            'location_records_deleted', cleaned_records,
            'sanitization_date', now()
        )
    );
    
    RETURN cleaned_records;
END;
$$;

-- 5. Sistema de detecção de padrões suspeitos
CREATE OR REPLACE FUNCTION public.detect_suspicious_patterns()
RETURNS TABLE(
    pattern_type text,
    severity text,
    description text,
    evidence jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verificar se é admin
    IF NOT has_role('admin'::user_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    WITH pattern_detection AS (
        -- Padrão 1: Múltiplos pedidos do mesmo IP em pouco tempo
        SELECT 
            'RAPID_ORDERS' as pattern_type,
            'HIGH' as severity,
            'Multiple orders from same IP in short time' as description,
            jsonb_build_object(
                'ip_addresses', jsonb_agg(DISTINCT ip_address),
                'order_count', COUNT(*),
                'time_window', '30 minutes'
            ) as evidence
        FROM audit_logs 
        WHERE operation = 'INSERT'
        AND table_name = 'orders'
        AND created_at > now() - interval '30 minutes'
        AND ip_address IS NOT NULL
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
        
        UNION ALL
        
        -- Padrão 2: Tentativas de acesso a dados de outros usuários
        SELECT 
            'UNAUTHORIZED_ACCESS_ATTEMPTS' as pattern_type,
            'CRITICAL' as severity,
            'Attempts to access unauthorized data detected' as description,
            jsonb_build_object(
                'user_id', user_id,
                'attempts', COUNT(*),
                'last_attempt', MAX(created_at)
            ) as evidence
        FROM audit_logs 
        WHERE operation = 'SECURITY_VALIDATION'
        AND new_values->>'event_type' = 'UNAUTHORIZED_ACCESS'
        AND created_at > now() - interval '1 hour'
        GROUP BY user_id
        HAVING COUNT(*) >= 3
    )
    SELECT * FROM pattern_detection;
END;
$$;

-- 6. Sistema de backup de segurança para configurações críticas
CREATE TABLE IF NOT EXISTS security_backups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type text NOT NULL,
    backup_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    description text
);

ALTER TABLE security_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security backups admin access" 
ON security_backups 
FOR ALL 
TO authenticated
USING (has_role('admin'::user_role));

-- 7. Função para criar backup das configurações de segurança
CREATE OR REPLACE FUNCTION public.backup_security_config()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    backup_id uuid;
    security_data jsonb;
BEGIN
    -- Verificar se é admin
    IF NOT has_role('admin'::user_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Coletar dados de configuração de segurança
    SELECT jsonb_object_agg(config_key, config_value) INTO security_data
    FROM security_config;
    
    -- Criar backup
    INSERT INTO security_backups (
        backup_type,
        backup_data,
        created_by,
        description
    ) VALUES (
        'SECURITY_CONFIG',
        security_data,
        auth.uid(),
        'Automatic security configuration backup'
    ) RETURNING id INTO backup_id;
    
    PERFORM log_security_event(
        'SECURITY_CONFIG_BACKED_UP',
        'security_backups',
        jsonb_build_object('backup_id', backup_id)
    );
    
    RETURN backup_id;
END;
$$;

-- 8. Atualizar configuração de segurança com novas funcionalidades
INSERT INTO security_config (config_key, config_value, description)
VALUES 
('real_time_monitoring', '{"status": "active"}'::jsonb, 'Real-time security monitoring system'),
('data_integrity_validation', '{"status": "active"}'::jsonb, 'Automated data integrity validation'),
('sensitive_data_sanitization', '{"status": "active"}'::jsonb, 'Automatic sensitive data cleanup'),
('suspicious_pattern_detection', '{"status": "active"}'::jsonb, 'Advanced pattern detection system'),
('security_config_backup', '{"status": "active"}'::jsonb, 'Security configuration backup system')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  applied_at = now();

-- 9. Executar backup inicial da configuração de segurança
SELECT backup_security_config() as initial_backup_id;
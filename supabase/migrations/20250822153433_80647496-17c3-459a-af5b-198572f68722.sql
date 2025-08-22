-- Corrigir problemas de segurança identificados pelo linter

-- 1. Adicionar search_path seguro às funções existentes
CREATE OR REPLACE FUNCTION validate_cpf(cpf_input text) 
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cpf text;
    digit1 integer;
    digit2 integer;
    sum1 integer := 0;
    sum2 integer := 0;
    i integer;
BEGIN
    -- Remove caracteres não numéricos
    cpf := regexp_replace(cpf_input, '[^0-9]', '', 'g');
    
    -- Verifica se tem 11 dígitos
    IF length(cpf) != 11 THEN
        RETURN false;
    END IF;
    
    -- Verifica sequências inválidas
    IF cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
               '44444444444', '55555555555', '66666666666', '77777777777',
               '88888888888', '99999999999') THEN
        RETURN false;
    END IF;
    
    -- Calcula primeiro dígito verificador
    FOR i IN 1..9 LOOP
        sum1 := sum1 + (substring(cpf from i for 1)::integer * (11 - i));
    END LOOP;
    
    digit1 := 11 - (sum1 % 11);
    IF digit1 >= 10 THEN
        digit1 := 0;
    END IF;
    
    -- Calcula segundo dígito verificador
    FOR i IN 1..10 LOOP
        sum2 := sum2 + (substring(cpf from i for 1)::integer * (12 - i));
    END LOOP;
    
    digit2 := 11 - (sum2 % 11);
    IF digit2 >= 10 THEN
        digit2 := 0;
    END IF;
    
    -- Verifica se os dígitos calculados conferem
    RETURN (substring(cpf from 10 for 1)::integer = digit1) AND
           (substring(cpf from 11 for 1)::integer = digit2);
END;
$$;

CREATE OR REPLACE FUNCTION validate_courier_submission()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    required_docs doc_type[] := ARRAY['CNH_FRENTE', 'SELFIE', 'COMPROVANTE_ENDERECO', 'CRLV', 'FOTO_VEICULO', 'FOTO_PLACA'];
    doc doc_type;
    doc_count integer;
BEGIN
    -- Só validar quando mudando para UNDER_REVIEW
    IF NEW.status = 'UNDER_REVIEW' AND (OLD.status IS NULL OR OLD.status != 'UNDER_REVIEW') THEN
        
        -- Validar CPF
        IF NOT validate_cpf(NEW.cpf) THEN
            RAISE EXCEPTION 'CPF inválido: %', NEW.cpf;
        END IF;
        
        -- Validar datas de validade
        IF NEW.cnh_valid_until IS NULL OR NEW.cnh_valid_until <= CURRENT_DATE THEN
            RAISE EXCEPTION 'CNH deve ter data de validade futura';
        END IF;
        
        IF NEW.crlv_valid_until IS NULL OR NEW.crlv_valid_until <= CURRENT_DATE THEN
            RAISE EXCEPTION 'CRLV deve ter data de validade futura';
        END IF;
        
        -- Validar campos obrigatórios
        IF NEW.full_name IS NULL OR LENGTH(TRIM(NEW.full_name)) < 2 THEN
            RAISE EXCEPTION 'Nome completo é obrigatório';
        END IF;
        
        IF NEW.birth_date IS NULL OR NEW.birth_date >= CURRENT_DATE - INTERVAL '18 years' THEN
            RAISE EXCEPTION 'Data de nascimento inválida (deve ser maior de idade)';
        END IF;
        
        IF NEW.phone IS NULL OR LENGTH(TRIM(NEW.phone)) < 10 THEN
            RAISE EXCEPTION 'Telefone é obrigatório';
        END IF;
        
        IF NEW.vehicle_brand IS NULL OR NEW.vehicle_model IS NULL OR NEW.plate IS NULL THEN
            RAISE EXCEPTION 'Dados do veículo são obrigatórios';
        END IF;
        
        IF NEW.pix_key_type IS NULL OR NEW.pix_key IS NULL THEN
            RAISE EXCEPTION 'Chave PIX é obrigatória';
        END IF;
        
        IF NEW.address_json IS NULL THEN
            RAISE EXCEPTION 'Endereço é obrigatório';
        END IF;
        
        -- Verificar se todos os documentos obrigatórios estão presentes
        FOREACH doc IN ARRAY required_docs LOOP
            SELECT COUNT(*) INTO doc_count 
            FROM courier_documents 
            WHERE courier_id = NEW.id AND type = doc;
            
            IF doc_count = 0 THEN
                RAISE EXCEPTION 'Documento obrigatório não encontrado: %', doc;
            END IF;
        END LOOP;
        
        -- Setar submitted_at
        NEW.submitted_at := now();
    END IF;
    
    -- Atualizar updated_at sempre
    NEW.updated_at := now();
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_courier_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log mudanças de status
    IF (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        INSERT INTO courier_reviews_log (courier_id, from_status, to_status, actor, reason)
        VALUES (
            NEW.id, 
            OLD.status, 
            NEW.status,
            current_setting('request.jwt.claims', true)::json->>'sub',
            CASE 
                WHEN NEW.status = 'REJECTED' THEN NEW.rejection_reason
                WHEN NEW.status = 'SUSPENDED' THEN NEW.suspended_reason
                ELSE NULL
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION expire_courier_documents()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Suspender entregadores com CNH vencida
    UPDATE couriers 
    SET status = 'SUSPENDED', 
        suspended_reason = 'CNH vencida em ' || cnh_valid_until::text,
        updated_at = now()
    WHERE status = 'APPROVED' 
      AND cnh_valid_until < CURRENT_DATE;
    
    -- Suspender entregadores com CRLV vencido
    UPDATE couriers 
    SET status = 'SUSPENDED', 
        suspended_reason = 'CRLV vencido em ' || crlv_valid_until::text,
        updated_at = now()
    WHERE status = 'APPROVED' 
      AND crlv_valid_until < CURRENT_DATE;
END;
$$;

-- Função segura para obter role do usuário atual (evitar recursão RLS)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

-- Habilitar RLS em tabelas que podem estar faltando
-- (algumas tabelas podem ter sido criadas sem RLS em migrações anteriores)

-- Verificar e habilitar RLS para spatial_ref_sys se existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spatial_ref_sys' AND table_schema = 'public') THEN
        ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
        
        -- Criar policy para spatial_ref_sys se não existir
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'spatial_ref_sys' AND policyname = 'Public read access') THEN
            CREATE POLICY "Public read access" ON public.spatial_ref_sys FOR SELECT USING (true);
        END IF;
    END IF;
END $$;

-- Criar função para obter informações de CEP (se necessário para endereços)
CREATE OR REPLACE FUNCTION format_address_from_json(address_json jsonb)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT CONCAT(
        COALESCE(address_json->>'street', ''),
        CASE WHEN address_json->>'number' IS NOT NULL THEN ', ' || (address_json->>'number') ELSE '' END,
        CASE WHEN address_json->>'neighborhood' IS NOT NULL THEN ', ' || (address_json->>'neighborhood') ELSE '' END,
        CASE WHEN address_json->>'city' IS NOT NULL THEN ', ' || (address_json->>'city') ELSE '' END,
        CASE WHEN address_json->>'state' IS NOT NULL THEN ' - ' || (address_json->>'state') ELSE '' END,
        CASE WHEN address_json->>'zip_code' IS NOT NULL THEN ', CEP: ' || (address_json->>'zip_code') ELSE '' END
    );
$$;
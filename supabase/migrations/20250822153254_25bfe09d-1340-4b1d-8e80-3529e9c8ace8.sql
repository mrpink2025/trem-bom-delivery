-- Criar enums necessários
CREATE TYPE courier_status AS ENUM ('DRAFT','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED');
CREATE TYPE doc_type AS ENUM ('CNH_FRENTE','CNH_VERSO','SELFIE','CPF_RG','COMPROVANTE_ENDERECO','CRLV','FOTO_VEICULO','FOTO_PLACA');
CREATE TYPE pix_key_type AS ENUM ('CPF','PHONE','EMAIL','EVP');

-- Tabela principal de entregadores
CREATE TABLE couriers (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status courier_status NOT NULL DEFAULT 'DRAFT',
    full_name text NOT NULL,
    birth_date date NOT NULL,
    cpf text NOT NULL,
    phone text NOT NULL,
    selfie_url text NULL,
    address_json jsonb,
    vehicle_brand text,
    vehicle_model text,
    vehicle_year integer,
    plate text,
    cnh_valid_until date,
    crlv_valid_until date,
    pix_key_type pix_key_type,
    pix_key text,
    rejection_reason text NULL,
    submitted_at timestamptz NULL,
    approved_at timestamptz NULL,
    suspended_reason text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tabela de documentos dos entregadores
CREATE TABLE courier_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    type doc_type NOT NULL,
    file_url text NOT NULL,
    mime text NOT NULL,
    size_bytes integer NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    notes text NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(courier_id, type)
);

-- Log de revisões e mudanças de status
CREATE TABLE courier_reviews_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    from_status courier_status,
    to_status courier_status,
    actor uuid,
    reason text,
    created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_couriers_status ON couriers(status);
CREATE INDEX idx_courier_documents_courier_id ON courier_documents(courier_id);
CREATE INDEX idx_courier_documents_type ON courier_documents(type);
CREATE INDEX idx_courier_reviews_log_courier_id ON courier_reviews_log(courier_id);
CREATE INDEX idx_couriers_cnh_valid ON couriers(cnh_valid_until) WHERE cnh_valid_until IS NOT NULL;
CREATE INDEX idx_couriers_crlv_valid ON couriers(crlv_valid_until) WHERE crlv_valid_until IS NOT NULL;

-- Função para validar CPF
CREATE OR REPLACE FUNCTION validate_cpf(cpf_input text) 
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para validar submissão para análise
CREATE OR REPLACE FUNCTION validate_courier_submission()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger para log de mudanças de status
CREATE OR REPLACE FUNCTION log_courier_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER validate_courier_submission_trigger
    BEFORE UPDATE ON couriers
    FOR EACH ROW EXECUTE FUNCTION validate_courier_submission();

CREATE TRIGGER log_courier_status_change_trigger
    AFTER UPDATE ON couriers
    FOR EACH ROW EXECUTE FUNCTION log_courier_status_change();

-- Função para expirar documentos automaticamente
CREATE OR REPLACE FUNCTION expire_courier_documents()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Storage buckets (serão criados via SQL storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('courier-docs', 'courier-docs', false),
    ('courier-photos', 'courier-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para courier-docs bucket
CREATE POLICY "Couriers can upload their documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'courier-docs' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Couriers can view their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'courier-docs' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR
     EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "Couriers can update their documents when DRAFT/REJECTED"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'courier-docs' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    EXISTS (SELECT 1 FROM couriers WHERE id = auth.uid() AND status IN ('DRAFT', 'REJECTED'))
);

CREATE POLICY "Couriers can delete their documents when DRAFT/REJECTED"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'courier-docs' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    EXISTS (SELECT 1 FROM couriers WHERE id = auth.uid() AND status IN ('DRAFT', 'REJECTED'))
);

CREATE POLICY "Admins can manage all courier documents"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'courier-docs' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies para courier-photos bucket
CREATE POLICY "Couriers can upload their photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'courier-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Couriers can view their photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'courier-photos' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR
     EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'))
);

CREATE POLICY "Couriers can update their photos when DRAFT/REJECTED"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'courier-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    EXISTS (SELECT 1 FROM couriers WHERE id = auth.uid() AND status IN ('DRAFT', 'REJECTED'))
);

CREATE POLICY "Couriers can delete their photos when DRAFT/REJECTED"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'courier-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    EXISTS (SELECT 1 FROM couriers WHERE id = auth.uid() AND status IN ('DRAFT', 'REJECTED'))
);

CREATE POLICY "Admins can manage all courier photos"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'courier-photos' AND
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS para tabelas

-- couriers RLS
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers can view their own profile"
ON couriers FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Couriers can insert their own profile"
ON couriers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Couriers can update when DRAFT or REJECTED"
ON couriers FOR UPDATE
TO authenticated
USING (
    auth.uid() = id AND 
    status IN ('DRAFT', 'REJECTED')
);

CREATE POLICY "Admins can view all couriers"
ON couriers FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update all couriers"
ON couriers FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- courier_documents RLS
ALTER TABLE courier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers can view their documents"
ON courier_documents FOR SELECT
TO authenticated
USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can insert documents when DRAFT or REJECTED"
ON courier_documents FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = courier_id AND
    EXISTS (SELECT 1 FROM couriers WHERE id = courier_id AND status IN ('DRAFT', 'REJECTED'))
);

CREATE POLICY "Couriers can delete documents when DRAFT or REJECTED"
ON courier_documents FOR DELETE
TO authenticated
USING (
    auth.uid() = courier_id AND
    EXISTS (SELECT 1 FROM couriers WHERE id = courier_id AND status IN ('DRAFT', 'REJECTED'))
);

CREATE POLICY "Admins can manage all courier documents"
ON courier_documents FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- courier_reviews_log RLS
ALTER TABLE courier_reviews_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers can view their review log"
ON courier_reviews_log FOR SELECT
TO authenticated
USING (auth.uid() = courier_id);

CREATE POLICY "Admins can view all review logs"
ON courier_reviews_log FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "System can insert review logs"
ON courier_reviews_log FOR INSERT
TO authenticated
WITH CHECK (true);
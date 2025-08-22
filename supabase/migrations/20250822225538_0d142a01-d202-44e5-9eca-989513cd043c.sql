-- =======================
-- STORAGE BUCKETS E POLICIES
-- =======================

-- Criar buckets para documentos (privados)
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES 
  ('merchant-docs', 'merchant-docs', false, 10485760),  -- 10MB
  ('courier-docs', 'courier-docs', false, 10485760)     -- 10MB
ON CONFLICT (id) DO NOTHING;

-- =======================
-- POLICIES PARA MERCHANT-DOCS
-- =======================

-- Permitir insert apenas pelo próprio merchant em status DRAFT/REJECTED
CREATE POLICY "Merchants can upload docs in DRAFT/REJECTED" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'merchant-docs' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM merchants m 
    WHERE m.id::text = (storage.foldername(name))[1] 
    AND m.owner_user_id = auth.uid() 
    AND m.status IN ('DRAFT', 'REJECTED')
  )
);

-- Permitir select apenas pelo próprio merchant ou admin
CREATE POLICY "Merchants and admins can view merchant docs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'merchant-docs' AND (
    -- Próprio merchant
    (auth.uid()::text = (storage.foldername(name))[1] AND
     EXISTS (
       SELECT 1 FROM merchants m 
       WHERE m.id::text = (storage.foldername(name))[1] 
       AND m.owner_user_id = auth.uid()
     )) OR
    -- Admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Permitir delete apenas pelo próprio merchant em status DRAFT/REJECTED
CREATE POLICY "Merchants can delete docs in DRAFT/REJECTED" ON storage.objects
FOR DELETE USING (
  bucket_id = 'merchant-docs' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM merchants m 
    WHERE m.id::text = (storage.foldername(name))[1] 
    AND m.owner_user_id = auth.uid() 
    AND m.status IN ('DRAFT', 'REJECTED')
  )
);

-- Admins podem deletar qualquer documento merchant
CREATE POLICY "Admins can delete merchant docs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'merchant-docs' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- =======================
-- POLICIES PARA COURIER-DOCS  
-- =======================

-- Permitir insert apenas pelo próprio courier em status DRAFT/REJECTED
CREATE POLICY "Couriers can upload docs in DRAFT/REJECTED" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'courier-docs' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM couriers c 
    WHERE c.id::text = (storage.foldername(name))[1] 
    AND c.id = auth.uid() 
    AND c.status IN ('DRAFT', 'REJECTED')
  )
);

-- Permitir select apenas pelo próprio courier ou admin
CREATE POLICY "Couriers and admins can view courier docs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'courier-docs' AND (
    -- Próprio courier
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- Permitir delete apenas pelo próprio courier em status DRAFT/REJECTED
CREATE POLICY "Couriers can delete docs in DRAFT/REJECTED" ON storage.objects
FOR DELETE USING (
  bucket_id = 'courier-docs' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM couriers c 
    WHERE c.id = auth.uid() 
    AND c.status IN ('DRAFT', 'REJECTED')
  )
);

-- Admins podem deletar qualquer documento courier
CREATE POLICY "Admins can delete courier docs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'courier-docs' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- =======================
-- TRIGGERS PARA VALIDAÇÃO DE DOCUMENTOS
-- =======================

-- Função para validar documentos obrigatórios do merchant
CREATE OR REPLACE FUNCTION validate_merchant_documents()
RETURNS TRIGGER AS $$
DECLARE
    required_docs text[] := ARRAY['CNPJ', 'CONTRATO_SOCIAL', 'ALVARA', 'VISA_SANITARIA', 'ENDERECO', 'LOGO'];
    missing_docs text[];
BEGIN
    -- Só validar quando mudando para UNDER_REVIEW
    IF NEW.status = 'UNDER_REVIEW' AND OLD.status != 'UNDER_REVIEW' THEN
        -- Verificar se todos os docs obrigatórios existem
        SELECT array_agg(doc_type) INTO missing_docs
        FROM unnest(required_docs) AS doc_type
        WHERE NOT EXISTS (
            SELECT 1 FROM merchant_documents 
            WHERE merchant_id = NEW.id AND type = doc_type::merchant_doc_type
        );
        
        IF array_length(missing_docs, 1) > 0 THEN
            RAISE EXCEPTION 'Documentos obrigatórios faltando: %', array_to_string(missing_docs, ', ');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para merchants
DROP TRIGGER IF EXISTS validate_merchant_docs_trigger ON merchants;
CREATE TRIGGER validate_merchant_docs_trigger
    BEFORE UPDATE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION validate_merchant_documents();

-- Função para validar documentos obrigatórios do courier
CREATE OR REPLACE FUNCTION validate_courier_documents()
RETURNS TRIGGER AS $$
DECLARE
    required_docs text[] := ARRAY['CNH_FRENTE', 'SELFIE', 'CRLV', 'FOTO_VEICULO', 'FOTO_PLACA'];
    missing_docs text[];
BEGIN
    -- Só validar quando mudando para UNDER_REVIEW
    IF NEW.status = 'UNDER_REVIEW' AND OLD.status != 'UNDER_REVIEW' THEN
        -- Verificar se todos os docs obrigatórios existem
        SELECT array_agg(doc_type) INTO missing_docs
        FROM unnest(required_docs) AS doc_type
        WHERE NOT EXISTS (
            SELECT 1 FROM courier_documents 
            WHERE courier_id = NEW.id AND type = doc_type::courier_doc_type
        );
        
        IF array_length(missing_docs, 1) > 0 THEN
            RAISE EXCEPTION 'Documentos obrigatórios faltando: %', array_to_string(missing_docs, ', ');
        END IF;
        
        -- Validar datas de validade
        IF NEW.cnh_valid_until IS NULL OR NEW.cnh_valid_until <= CURRENT_DATE THEN
            RAISE EXCEPTION 'CNH deve ter data de validade futura';
        END IF;
        
        IF NEW.crlv_valid_until IS NULL OR NEW.crlv_valid_until <= CURRENT_DATE THEN
            RAISE EXCEPTION 'CRLV deve ter data de validade futura';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para couriers
DROP TRIGGER IF EXISTS validate_courier_docs_trigger ON couriers;
CREATE TRIGGER validate_courier_docs_trigger
    BEFORE UPDATE ON couriers
    FOR EACH ROW
    EXECUTE FUNCTION validate_courier_documents();

-- =======================
-- TRIGGERS PARA LOGS DE REVISÃO
-- =======================

-- Função para logar mudanças de status do merchant
CREATE OR REPLACE FUNCTION log_merchant_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO merchant_reviews_log (merchant_id, from_status, to_status, actor, reason)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.rejection_reason);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para log de merchant
DROP TRIGGER IF EXISTS log_merchant_status_trigger ON merchants;
CREATE TRIGGER log_merchant_status_trigger
    AFTER UPDATE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION log_merchant_status_change();

-- Função para logar mudanças de status do courier
CREATE OR REPLACE FUNCTION log_courier_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO courier_reviews_log (courier_id, from_status, to_status, actor, reason)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.rejection_reason);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para log de courier
DROP TRIGGER IF EXISTS log_courier_status_trigger ON couriers;
CREATE TRIGGER log_courier_status_trigger
    AFTER UPDATE ON couriers
    FOR EACH ROW
    EXECUTE FUNCTION log_courier_status_change();

-- =======================
-- FUNÇÃO PARA ARREDONDAMENTO PSICOLÓGICO
-- =======================

CREATE OR REPLACE FUNCTION apply_psychological_rounding(price NUMERIC, rounding_type TEXT)
RETURNS NUMERIC AS $$
BEGIN
    CASE rounding_type
        WHEN 'UP_TO_99' THEN
            RETURN FLOOR(price) + 0.99;
        WHEN 'UP_TO_90' THEN
            RETURN FLOOR(price) + 0.90;
        WHEN 'ROUND_TO_HALF' THEN
            RETURN ROUND(price * 2) / 2;
        WHEN 'ROUND_TO_FULL' THEN
            RETURN ROUND(price);
        ELSE
            RETURN price; -- NONE
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
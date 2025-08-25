-- Criar tabela para validação de SMS
CREATE TABLE IF NOT EXISTS sms_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    phone_number TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela para confirmações de entrega
CREATE TABLE IF NOT EXISTS delivery_confirmations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    courier_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    confirmation_code TEXT NOT NULL,
    code_attempts INTEGER DEFAULT 0,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    location_lat NUMERIC,
    location_lng NUMERIC,
    is_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna phone_verified na tabela profiles se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Habilitar RLS nas novas tabelas
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sms_verifications
CREATE POLICY "Users can view their SMS verifications" ON sms_verifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their SMS verifications" ON sms_verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their SMS verifications" ON sms_verifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas RLS para delivery_confirmations
CREATE POLICY "Couriers can view their delivery confirmations" ON delivery_confirmations
    FOR SELECT USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can insert delivery confirmations" ON delivery_confirmations
    FOR INSERT WITH CHECK (auth.uid() = courier_id);

CREATE POLICY "Couriers can update delivery confirmations" ON delivery_confirmations
    FOR UPDATE USING (auth.uid() = courier_id);

CREATE POLICY "Customers can view their delivery confirmations" ON delivery_confirmations
    FOR SELECT USING (auth.uid() = customer_id);

-- Função para gerar código de confirmação baseado nos 4 últimos dígitos do celular
CREATE OR REPLACE FUNCTION generate_delivery_confirmation_code(p_customer_phone TEXT)
RETURNS TEXT AS $$
DECLARE
    last_digits TEXT;
BEGIN
    -- Extrair os 4 últimos dígitos do telefone
    last_digits := RIGHT(REGEXP_REPLACE(p_customer_phone, '[^0-9]', '', 'g'), 4);
    
    -- Se não tiver 4 dígitos, usar 0000
    IF LENGTH(last_digits) < 4 THEN
        last_digits := LPAD(last_digits, 4, '0');
    END IF;
    
    RETURN last_digits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar código de confirmação de entrega
CREATE OR REPLACE FUNCTION validate_delivery_confirmation(
    p_order_id UUID,
    p_courier_id UUID,
    p_confirmation_code TEXT,
    p_location_lat NUMERIC DEFAULT NULL,
    p_location_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_confirmation RECORD;
    v_customer_phone TEXT;
    v_expected_code TEXT;
    v_result JSONB;
BEGIN
    -- Buscar a confirmação de entrega
    SELECT * INTO v_confirmation
    FROM delivery_confirmations
    WHERE order_id = p_order_id 
    AND courier_id = p_courier_id
    AND is_confirmed = FALSE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Confirmação de entrega não encontrada'
        );
    END IF;
    
    -- Buscar telefone do cliente
    SELECT p.phone_number INTO v_customer_phone
    FROM orders o
    JOIN profiles p ON p.user_id = o.user_id
    WHERE o.id = p_order_id;
    
    IF v_customer_phone IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Telefone do cliente não encontrado'
        );
    END IF;
    
    -- Gerar código esperado
    v_expected_code := generate_delivery_confirmation_code(v_customer_phone);
    
    -- Incrementar tentativas
    UPDATE delivery_confirmations 
    SET code_attempts = code_attempts + 1
    WHERE id = v_confirmation.id;
    
    -- Validar código
    IF p_confirmation_code = v_expected_code THEN
        -- Código correto - confirmar entrega
        UPDATE delivery_confirmations 
        SET 
            is_confirmed = TRUE,
            confirmed_at = NOW(),
            location_lat = p_location_lat,
            location_lng = p_location_lng
        WHERE id = v_confirmation.id;
        
        -- Log de auditoria
        INSERT INTO audit_logs (
            table_name, operation, record_id, new_values, user_id
        ) VALUES (
            'delivery_confirmations', 'DELIVERY_CONFIRMED', 
            v_confirmation.id,
            jsonb_build_object(
                'order_id', p_order_id,
                'courier_id', p_courier_id,
                'confirmation_code', p_confirmation_code,
                'location', jsonb_build_object('lat', p_location_lat, 'lng', p_location_lng),
                'confirmed_at', NOW()
            ),
            p_courier_id
        );
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Entrega confirmada com sucesso'
        );
    ELSE
        -- Código incorreto
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Código de confirmação incorreto',
            'attempts', v_confirmation.code_attempts + 1
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
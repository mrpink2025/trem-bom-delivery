-- Corrigir problemas de segurança (versão corrigida)

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

-- Atualizar outras funções já existentes para usar search_path (já foram atualizadas na migração anterior)

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
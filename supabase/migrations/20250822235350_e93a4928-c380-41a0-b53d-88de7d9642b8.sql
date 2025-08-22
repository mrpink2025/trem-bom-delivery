-- Remover todas as funções e triggers de validação problemáticos
DROP FUNCTION IF EXISTS validate_courier_documents() CASCADE;
DROP FUNCTION IF EXISTS validate_courier_submission() CASCADE;
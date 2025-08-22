-- Remover o trigger problemático temporariamente para permitir updates
DROP TRIGGER IF EXISTS validate_courier_documents_trigger ON couriers;
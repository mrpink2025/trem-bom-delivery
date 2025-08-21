-- Etapa 1: Adicionar valor ao enum (deve ser feito em transação separada)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment';
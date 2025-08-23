-- Adicionar colunas de endereço detalhado para restaurantes
ALTER TABLE restaurants 
ADD COLUMN street TEXT,
ADD COLUMN number TEXT, 
ADD COLUMN complement TEXT,
ADD COLUMN zip_code TEXT;
-- Adicionar créditos para o admin testar o sistema de jogos
UPDATE user_wallets 
SET balance = 100.00, 
    updated_at = now()
WHERE user_id = '80b3df54-5c11-4b88-ad6f-81564ffe7da0';
-- Add 100 reais to user arturalvesjunior2024@gmail.com for testing
DO $$
DECLARE
    target_user_id uuid := 'fef9dc68-84d1-46ae-9eeb-ce88e8e80c14';
    credit_amount numeric := 100; -- 100 reais
BEGIN
    -- Insert or update wallet balance
    INSERT INTO user_wallets (user_id, balance, locked_balance, created_at, updated_at)
    VALUES (target_user_id, credit_amount, 0, now(), now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        balance = user_wallets.balance + credit_amount,
        updated_at = now();
    
    -- Add transaction to ledger
    INSERT INTO wallet_ledger (user_id, type, amount, reason, description, created_at)
    VALUES (
        target_user_id, 
        'CREDIT', 
        credit_amount, 
        'ADMIN_ADJUST', 
        'Créditos adicionados para teste - 100 reais',
        now()
    );
END $$;
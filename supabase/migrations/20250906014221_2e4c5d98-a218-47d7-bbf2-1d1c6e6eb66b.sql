-- Add 100 reais (10000 cents) to user arturalvesjunior2024@gmail.com for testing
DO $$
DECLARE
    target_user_id uuid := 'fef9dc68-84d1-46ae-9eeb-ce88e8e80c14';
    credit_amount integer := 10000; -- 100 reais in cents
BEGIN
    -- Insert or update wallet balance
    INSERT INTO game_wallets (user_id, balance_cents, locked_balance_cents, created_at, updated_at)
    VALUES (target_user_id, credit_amount, 0, now(), now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        balance_cents = game_wallets.balance_cents + credit_amount,
        updated_at = now();
    
    -- Add transaction to ledger
    INSERT INTO wallet_ledger (user_id, type, amount_cents, balance_after_cents, reason, description, created_at)
    VALUES (
        target_user_id, 
        'CREDIT'::transaction_type, 
        credit_amount, 
        (SELECT balance_cents FROM game_wallets WHERE user_id = target_user_id),
        'ADMIN_CREDIT'::transaction_reason, 
        'Créditos adicionados para teste - 100 reais',
        now()
    );
END $$;
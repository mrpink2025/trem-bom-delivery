-- Add missing locked_balance column to game_wallets
ALTER TABLE game_wallets ADD COLUMN IF NOT EXISTS locked_balance integer NOT NULL DEFAULT 0;

-- Verify and update the create_pool_match_tx function to handle the correct column names
-- The function should work with the existing columns in game_ledger and game_wallets
CREATE OR REPLACE FUNCTION create_pool_match_tx(
  p_user_id uuid,
  p_mode text, 
  p_buy_in integer,
  p_shot_clock integer,
  p_assist text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id uuid;
  v_current_balance integer;
  v_match_id uuid;
  v_join_code text;
  v_max_attempts integer := 10;
  v_attempt integer := 0;
BEGIN
  -- Get user's wallet
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM game_wallets 
  WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  
  -- Check sufficient funds
  IF v_current_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;
  
  -- Reserve credits (update wallet balance and locked_balance)
  UPDATE game_wallets 
  SET 
    balance = balance - p_buy_in,
    locked_balance = locked_balance + p_buy_in,
    updated_at = now()
  WHERE id = v_wallet_id;
  
  -- Generate unique join code
  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'RETRY_JOIN_CODE';
    END IF;
    
    v_join_code := upper(substring(md5(random()::text) from 1 for 6));
    
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM game_matches WHERE join_code = v_join_code
    );
  END LOOP;
  
  -- Create match
  INSERT INTO game_matches (
    created_by, game, mode, buy_in, max_players, 
    current_players, status, join_code, game_state
  ) 
  VALUES (
    p_user_id, 'POOL'::game_type, p_mode::match_mode, p_buy_in, 2, 
    0, 'LOBBY'::match_status, v_join_code, 
    jsonb_build_object(
      'rules', jsonb_build_object(
        'shotClockSec', p_shot_clock,
        'assistLevel', p_assist
      )
    )
  )
  RETURNING id INTO v_match_id;
  
  -- Add match_players entry
  INSERT INTO match_players (match_id, user_id, joined_at, credits_reserved)
  VALUES (v_match_id, p_user_id, now(), p_buy_in);
  
  -- Record ledger transaction for reservation
  INSERT INTO game_ledger (
    user_id, wallet_id, match_id, type, amount_credits, 
    description, balance_after
  )
  VALUES (
    p_user_id, v_wallet_id, v_match_id, 'RESERVE_CREDITS',
    -p_buy_in, 'Credits reserved for match', 
    v_current_balance - p_buy_in
  );
  
  RETURN jsonb_build_object(
    'matchId', v_match_id,
    'joinCode', v_join_code,
    'status', 'LOBBY'
  );
END;
$$;
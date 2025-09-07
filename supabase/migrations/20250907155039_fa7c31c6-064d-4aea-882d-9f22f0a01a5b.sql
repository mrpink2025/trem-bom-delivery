-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_pool_match_tx(uuid,text,integer,integer,text);

-- Create or replace the pool match creation RPC
CREATE OR REPLACE FUNCTION public.create_pool_match_tx(
  p_user_id uuid,
  p_mode text,
  p_buy_in integer,
  p_shot_clock integer,
  p_assist text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id uuid;
  v_join_code text;
  v_wallet_balance integer;
  v_result json;
BEGIN
  -- Validate inputs
  IF p_mode NOT IN ('CASUAL', 'RANKED') THEN
    RAISE EXCEPTION 'Invalid mode: %', p_mode;
  END IF;
  
  IF p_buy_in <= 0 THEN
    RAISE EXCEPTION 'Buy-in must be positive';
  END IF;
  
  IF p_shot_clock < 10 OR p_shot_clock > 90 THEN
    RAISE EXCEPTION 'Shot clock must be between 10 and 90 seconds';
  END IF;
  
  IF p_assist NOT IN ('NONE', 'SHORT') THEN
    RAISE EXCEPTION 'Invalid assist level: %', p_assist;
  END IF;

  -- Check if user has sufficient balance
  SELECT current_points INTO v_wallet_balance 
  FROM customer_rewards 
  WHERE user_id = p_user_id;
  
  IF v_wallet_balance IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  
  IF v_wallet_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  -- Generate unique join code
  LOOP
    v_join_code := UPPER(substring(md5(random()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM pool_matches WHERE join_code = v_join_code AND status IN ('LOBBY', 'COUNTDOWN', 'LIVE'));
  END LOOP;

  -- Generate match ID
  v_match_id := gen_random_uuid();

  -- Create the match
  INSERT INTO pool_matches (
    id,
    creator_user_id,
    mode,
    buy_in,
    status,
    join_code,
    rules,
    players,
    created_at,
    updated_at
  ) VALUES (
    v_match_id,
    p_user_id,
    p_mode,
    p_buy_in,
    'LOBBY',
    v_join_code,
    jsonb_build_object(
      'shotClockSec', p_shot_clock,
      'assistLevel', p_assist
    ),
    jsonb_build_array(
      jsonb_build_object(
        'user_id', p_user_id,
        'seat', 1,
        'connected', false,
        'ready', false,
        'mmr', 1000
      )
    ),
    now(),
    now()
  );

  -- Deduct buy-in from wallet
  UPDATE customer_rewards 
  SET 
    current_points = current_points - p_buy_in,
    total_points_redeemed = total_points_redeemed + p_buy_in,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Create ledger entry
  INSERT INTO game_ledger (
    user_id,
    amount_credits,
    type,
    description,
    match_id,
    balance_after
  ) VALUES (
    p_user_id,
    -p_buy_in,
    'MATCH_BUY_IN',
    'Pool match buy-in',
    v_match_id,
    v_wallet_balance - p_buy_in
  );

  -- Return result
  v_result := json_build_object(
    'matchId', v_match_id,
    'joinCode', v_join_code,
    'status', 'LOBBY',
    'mode', p_mode,
    'buyIn', p_buy_in,
    'rules', json_build_object(
      'shotClockSec', p_shot_clock,
      'assistLevel', p_assist
    )
  );

  RETURN v_result;
END;
$$;
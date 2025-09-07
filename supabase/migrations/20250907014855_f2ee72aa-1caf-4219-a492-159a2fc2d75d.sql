-- Fix the RPC to use correct pool_matches table structure
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
  v_match_id uuid;
  v_user_balance integer;
  v_join_code text;
  v_result jsonb;
BEGIN
  -- Log the function call
  RAISE LOG 'create_pool_match_tx called with user_id=%, mode=%, buy_in=%, shot_clock=%, assist=%', 
    p_user_id, p_mode, p_buy_in, p_shot_clock, p_assist;

  -- Validate user exists and get balance
  SELECT COALESCE(balance, 0) INTO v_user_balance 
  FROM game_wallets 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found for user_id=%', p_user_id;
  END IF;

  -- Check if user has enough balance
  IF v_user_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: balance=% required=%', v_user_balance, p_buy_in;
  END IF;

  -- Generate unique join code (retry up to 5 times)
  FOR i IN 1..5 LOOP
    v_join_code := UPPER(substring(md5(random()::text), 1, 6));
    
    -- Check if join code is unique
    IF NOT EXISTS (SELECT 1 FROM pool_matches WHERE join_code = v_join_code) THEN
      EXIT;
    END IF;
    
    -- If we're on the last iteration and still no unique code
    IF i = 5 THEN
      RAISE EXCEPTION 'RETRY_JOIN_CODE: Could not generate unique join code';
    END IF;
  END LOOP;

  -- Generate match ID
  v_match_id := gen_random_uuid();

  -- Create the match using correct column structure
  INSERT INTO pool_matches (
    id,
    mode,
    buy_in,
    rake_pct,
    status,
    max_players,
    creator_user_id,
    join_code,
    rules,
    shot_clock,
    game_phase,
    ball_in_hand,
    players,
    created_at,
    updated_at,
    expires_at
  ) VALUES (
    v_match_id,
    p_mode,
    p_buy_in,
    0.05,
    'LOBBY',
    2,
    p_user_id,
    v_join_code,
    jsonb_build_object(
      'shotClockSec', p_shot_clock,
      'assistLevel', p_assist
    ),
    p_shot_clock,
    'LOBBY',
    false,
    jsonb_build_array(
      jsonb_build_object(
        'user_id', p_user_id,
        'seat', 1,
        'ready', false,
        'connected', true
      )
    ),
    now(),
    now(),
    now() + interval '1 hour'
  );

  -- Deduct buy-in from user wallet
  UPDATE game_wallets 
  SET balance = balance - p_buy_in,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Build result
  v_result := jsonb_build_object(
    'matchId', v_match_id,
    'joinCode', v_join_code,
    'status', 'LOBBY',
    'message', 'Match created successfully'
  );

  RAISE LOG 'create_pool_match_tx completed successfully: %', v_result;
  
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'create_pool_match_tx error: % %', SQLSTATE, SQLERRM;
    RAISE;
END;
$$;
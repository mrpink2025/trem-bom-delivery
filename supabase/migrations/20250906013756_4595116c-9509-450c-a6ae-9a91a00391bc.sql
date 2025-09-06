-- Fix the create_pool_match_tx function to match the actual table schema
CREATE OR REPLACE FUNCTION public.create_pool_match_tx(
  p_user_id uuid,
  p_mode text,
  p_buy_in integer,
  p_shot_clock integer,
  p_assist text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE 
  v_balance numeric; 
  v_locked numeric; 
  v_match_id uuid := gen_random_uuid();
  v_current_balance numeric;
BEGIN
  -- Validate input parameters
  IF p_mode NOT IN ('CASUAL', 'RANKED') THEN
    RAISE EXCEPTION 'INVALID_MODE: %', p_mode;
  END IF;
  
  IF p_buy_in < 1 OR p_buy_in > 100000 THEN
    RAISE EXCEPTION 'INVALID_BUY_IN: %', p_buy_in;
  END IF;
  
  IF p_shot_clock < 10 OR p_shot_clock > 90 THEN
    RAISE EXCEPTION 'INVALID_SHOT_CLOCK: %', p_shot_clock;
  END IF;
  
  IF p_assist NOT IN ('NONE', 'SHORT') THEN
    RAISE EXCEPTION 'INVALID_ASSIST: %', p_assist;
  END IF;

  -- Lock wallet row for atomic operations
  SELECT balance, locked_balance INTO v_balance, v_locked
  FROM user_wallets 
  WHERE user_id = p_user_id 
  FOR UPDATE;

  -- Create wallet if doesn't exist
  IF v_balance IS NULL THEN
    INSERT INTO user_wallets(user_id, balance, locked_balance)
    VALUES(p_user_id, 0, 0);
    v_balance := 0;
    v_locked := 0;
  END IF;

  -- Check available balance
  v_current_balance := v_balance - v_locked;
  IF v_current_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: available=%, required=%', v_current_balance, p_buy_in;
  END IF;

  -- Reserve credits (move from balance to locked_balance)
  UPDATE user_wallets
  SET locked_balance = locked_balance + p_buy_in,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create match with correct schema
  INSERT INTO pool_matches(
    id, mode, buy_in, rake_pct, status, max_players,
    players, table_config, balls, turn_user_id, game_phase,
    shot_clock, rules, history, created_at, updated_at
  ) VALUES(
    v_match_id, 
    p_mode, 
    p_buy_in, 
    0.05, 
    'LOBBY', 
    2,
    jsonb_build_array(
      jsonb_build_object(
        'userId', p_user_id, 
        'seat', 0, 
        'connected', true, 
        'mmr', 1000
      )
    ),
    jsonb_build_object(
      'width', 800,
      'height', 400,
      'pockets', jsonb_build_array(),
      'cushions', jsonb_build_array(),
      'friction', 0.98,
      'cushionRestitution', 0.93
    ),
    jsonb_build_array(), -- balls will be set when game starts
    p_user_id,
    'BREAK', -- initial game phase
    p_shot_clock,
    jsonb_build_object(
      'shotClockSec', p_shot_clock,
      'assistLevel', p_assist
    ),
    jsonb_build_array(),
    now(),
    now()
  );

  -- Record transaction in ledger
  INSERT INTO wallet_ledger(
    id, user_id, type, amount, reason, match_id, description, created_at
  ) VALUES(
    gen_random_uuid(),
    p_user_id,
    'DEBIT',
    p_buy_in,
    'BUY_IN',
    v_match_id,
    'Pool match buy-in: ' || p_mode,
    now()
  );

  RETURN jsonb_build_object(
    'matchId', v_match_id, 
    'status', 'LOBBY',
    'players', jsonb_array_length((SELECT players FROM pool_matches WHERE id = v_match_id)),
    'maxPlayers', 2
  );

EXCEPTION 
  WHEN OTHERS THEN
    -- Re-raise with original error for proper handling in Edge Function
    RAISE;
END;
$$;
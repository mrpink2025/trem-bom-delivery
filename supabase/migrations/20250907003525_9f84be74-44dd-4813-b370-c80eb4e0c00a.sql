-- Migration: Fix pool matches schema and add missing columns
-- Add missing columns for proper match management
ALTER TABLE pool_matches ADD COLUMN IF NOT EXISTS creator_user_id uuid;
ALTER TABLE pool_matches ADD COLUMN IF NOT EXISTS opponent_user_id uuid;
ALTER TABLE pool_matches ADD COLUMN IF NOT EXISTS join_code text;

-- Create unique index for join_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_matches_join_code_unique ON pool_matches (join_code) WHERE join_code IS NOT NULL;

-- Add index for better performance on creator queries
CREATE INDEX IF NOT EXISTS idx_pool_matches_creator_user_id ON pool_matches (creator_user_id);
CREATE INDEX IF NOT EXISTS idx_pool_matches_opponent_user_id ON pool_matches (opponent_user_id);

-- Function to generate unique join codes (Base32 without I/1/O/0)
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; -- Base32 without I/1/O/0
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function for creating pool matches atomically
CREATE OR REPLACE FUNCTION create_pool_match_tx(
  p_mode text,
  p_buy_in numeric,
  p_shot_clock integer DEFAULT 60,
  p_assist text DEFAULT 'SHORT'
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_match_id uuid;
  v_join_code text;
  v_current_balance numeric;
  v_result jsonb;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Generate unique join code
  LOOP
    v_join_code := generate_join_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM pool_matches WHERE join_code = v_join_code);
  END LOOP;

  -- Check and lock user balance
  SELECT balance INTO v_current_balance 
  FROM user_wallets 
  WHERE user_id = v_user_id 
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    INSERT INTO user_wallets (user_id, balance, locked_balance)
    VALUES (v_user_id, 0, 0);
    v_current_balance := 0;
  END IF;

  IF v_current_balance < p_buy_in THEN
    RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', p_buy_in, v_current_balance
      USING ERRCODE = 'P0001';
  END IF;

  -- Create match
  v_match_id := gen_random_uuid();
  
  INSERT INTO pool_matches (
    id,
    creator_user_id,
    game_type,
    mode,
    buy_in,
    shot_clock,
    assist_level,
    status,
    join_code,
    max_players,
    current_players,
    game_state,
    created_at,
    expires_at
  ) VALUES (
    v_match_id,
    v_user_id,
    'POOL_8_BALL',
    p_mode,
    p_buy_in,
    p_shot_clock,
    p_assist,
    'LOBBY',
    v_join_code,
    2,
    1,
    jsonb_build_object(
      'players', jsonb_build_array(
        jsonb_build_object(
          'user_id', v_user_id,
          'ready', false,
          'connected', false,
          'seat', 1
        )
      ),
      'balls', '[]'::jsonb,
      'turn_user_id', null,
      'phase', 'BREAK'
    ),
    now(),
    now() + interval '10 minutes'
  );

  -- Lock user balance
  UPDATE user_wallets 
  SET 
    balance = balance - p_buy_in,
    locked_balance = locked_balance + p_buy_in
  WHERE user_id = v_user_id;

  -- Create ledger entry
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount_cents,
    description,
    match_id,
    reference_id
  ) VALUES (
    v_user_id,
    'DEBIT',
    (p_buy_in * 100)::integer,
    'Pool match buy-in locked',
    v_match_id,
    v_match_id
  );

  -- Return result
  v_result := jsonb_build_object(
    'matchId', v_match_id,
    'joinCode', v_join_code,
    'status', 'LOBBY',
    'buyIn', p_buy_in,
    'currentPlayers', 1
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function for joining by code
CREATE OR REPLACE FUNCTION join_pool_match_by_code(p_join_code text)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_match record;
  v_current_balance numeric;
  v_result jsonb;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Find and lock match
  SELECT * INTO v_match
  FROM pool_matches
  WHERE join_code = p_join_code AND status = 'LOBBY'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found or no longer available'
      USING ERRCODE = 'P0002';
  END IF;

  -- Prevent self-join
  IF v_match.creator_user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot join your own match'
      USING ERRCODE = 'P0003';
  END IF;

  -- Check if match is full
  IF v_match.current_players >= v_match.max_players THEN
    RAISE EXCEPTION 'Match is full'
      USING ERRCODE = 'P0004';
  END IF;

  -- Check and lock user balance
  SELECT balance INTO v_current_balance 
  FROM user_wallets 
  WHERE user_id = v_user_id 
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    INSERT INTO user_wallets (user_id, balance, locked_balance)
    VALUES (v_user_id, 0, 0);
    v_current_balance := 0;
  END IF;

  IF v_current_balance < v_match.buy_in THEN
    RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_match.buy_in, v_current_balance
      USING ERRCODE = 'P0001';
  END IF;

  -- Update match with opponent
  UPDATE pool_matches 
  SET 
    opponent_user_id = v_user_id,
    current_players = 2,
    game_state = jsonb_set(
      game_state,
      '{players}',
      game_state->'players' || jsonb_build_array(
        jsonb_build_object(
          'user_id', v_user_id,
          'ready', false,
          'connected', false,
          'seat', 2
        )
      )
    )
  WHERE id = v_match.id;

  -- Lock user balance
  UPDATE user_wallets 
  SET 
    balance = balance - v_match.buy_in,
    locked_balance = locked_balance + v_match.buy_in
  WHERE user_id = v_user_id;

  -- Create ledger entry
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount_cents,
    description,
    match_id,
    reference_id
  ) VALUES (
    v_user_id,
    'DEBIT',
    (v_match.buy_in * 100)::integer,
    'Pool match buy-in locked',
    v_match.id,
    v_match.id
  );

  -- Return result
  v_result := jsonb_build_object(
    'matchId', v_match.id,
    'status', 'LOBBY',
    'currentPlayers', 2,
    'joined', true
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Fix create_pool_match_tx RPC with correct types
CREATE OR REPLACE FUNCTION public.create_pool_match_tx(p_user_id uuid, p_mode text, p_buy_in integer, p_shot_clock integer, p_assist text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
  v_locked  numeric;
  v_match_id uuid := gen_random_uuid();
  v_join_code text;
  v_try int := 0;
BEGIN
  -- Create wallet if it doesn't exist
  INSERT INTO public.wallets (user_id, balance, locked_balance)
  VALUES (p_user_id, 1000, 0) -- Default 1000 credits
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Lock wallet for update
  SELECT balance, locked_balance INTO v_balance, v_locked
    FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  IF v_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  -- Generate unique join_code with retry
  LOOP
    v_try := v_try + 1;
    -- Generate 6-character alphanumeric code
    v_join_code := upper(substring(encode(gen_random_bytes(4), 'base64') from 1 for 6));
    -- Remove problematic characters
    v_join_code := translate(v_join_code, '+/=', 'XYZ');

    BEGIN
      -- Update wallet balance
      UPDATE public.wallets
         SET balance = balance - p_buy_in,
             locked_balance = locked_balance + p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;

      -- Insert into game_matches using correct types
      INSERT INTO public.game_matches (
        id, game, mode, buy_in, rake_pct, status, max_players, current_players,
        created_by, winner_user_ids, rng_seed, game_state, join_code,
        created_at, updated_at
      ) VALUES (
        v_match_id,
        'SINUCA'::game_type,  -- Fixed: was 'POOL'
        p_mode::match_mode,   -- Fixed: was game_mode
        p_buy_in,
        0.05,
        'LOBBY'::match_status,
        2,
        1,
        p_user_id,
        NULL,
        NULL,
        jsonb_build_object(
          'rules', jsonb_build_object('shotClockSec', p_shot_clock, 'assistLevel', p_assist),
          'players', jsonb_build_array(
            jsonb_build_object('userId', p_user_id, 'seat', 1, 'connected', true, 'ready', false, 'score', 0)
          )
        ),
        v_join_code,
        now(),
        now()
      );

      -- Record ledger entries
      INSERT INTO public.ledger(id, user_id, type, amount, reason, match_id, created_at)
      VALUES(gen_random_uuid(), p_user_id, 'DEBIT', p_buy_in, 'BUY_IN', v_match_id, now());

      EXIT; -- Success
    EXCEPTION WHEN unique_violation THEN
      -- Rollback wallet update and try another join_code
      UPDATE public.wallets
         SET balance = balance + p_buy_in,
             locked_balance = locked_balance - p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;

      IF v_try < 5 THEN
        CONTINUE;
      ELSE
        RAISE;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('matchId', v_match_id, 'joinCode', v_join_code, 'status', 'LOBBY');
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;
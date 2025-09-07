-- Corrige a função create_pool_match_tx para usar game_phase correto
CREATE OR REPLACE FUNCTION public.create_pool_match_tx(
  p_user_id uuid,
  p_mode text,
  p_buy_in integer,
  p_shot_clock integer,
  p_assist text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_match_id uuid := gen_random_uuid();
  v_join_code text;
  v_try int := 0;
BEGIN
  -- cria wallet se não existir
  INSERT INTO public.game_wallets(user_id, balance, locked_balance)
  VALUES (p_user_id, 1000, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- lock e saldo
  SELECT balance INTO v_balance FROM public.game_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;
  IF v_balance < p_buy_in THEN RAISE EXCEPTION 'INSUFFICIENT_FUNDS'; END IF;

  -- join_code único (até 5 tentativas)
  LOOP
    v_try := v_try + 1;
    SELECT public.generate_join_code() INTO v_join_code;

    BEGIN
      -- debita e bloqueia
      UPDATE public.game_wallets
         SET balance = balance - p_buy_in,
             locked_balance = locked_balance + p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;

      -- cria match com game_phase correto
      INSERT INTO public.pool_matches(
        id, mode, buy_in, rake_pct, status, max_players, creator_user_id, join_code,
        rules, shot_clock, game_phase, ball_in_hand, players, created_at, updated_at, expires_at
      ) VALUES (
        v_match_id,
        p_mode, p_buy_in, 0.05, 'LOBBY', 2, p_user_id, v_join_code,
        jsonb_build_object('shotClockSec', p_shot_clock, 'assistLevel', p_assist),
        p_shot_clock, 'WAITING', false,
        jsonb_build_array(jsonb_build_object('user_id', p_user_id, 'seat', 1, 'ready', false, 'connected', true)),
        now(), now(), now() + interval '15 minutes'
      );

      -- ledger
      INSERT INTO public.game_ledger(user_id, wallet_id, match_id, type, amount, balance_after, description, created_at)
      VALUES(
        p_user_id,
        (SELECT id FROM public.game_wallets WHERE user_id=p_user_id),
        v_match_id,
        'DEBIT',
        p_buy_in,
        (SELECT balance FROM public.game_wallets WHERE user_id=p_user_id),
        'BUY_IN',
        now()
      );

      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- desfaz e tenta outro código
      UPDATE public.game_wallets
         SET balance = balance + p_buy_in,
             locked_balance = locked_balance - p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;
      IF v_try < 5 THEN CONTINUE; ELSE RAISE; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('matchId', v_match_id, 'joinCode', v_join_code, 'status', 'LOBBY');
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;
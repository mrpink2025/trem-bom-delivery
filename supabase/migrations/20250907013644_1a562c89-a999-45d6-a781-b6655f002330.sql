-- Criar a função create_pool_match_tx com correções completas
CREATE OR REPLACE FUNCTION public.create_pool_match_tx(
  p_user_id uuid,
  p_mode match_mode,
  p_buy_in integer,
  p_shot_clock integer,
  p_assist text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_match_id uuid;
  v_join_code text;
  v_wallet_id uuid;
  v_current_balance integer;
BEGIN
  -- Log da função para debug
  RAISE LOG 'create_pool_match_tx called with user_id=%, mode=%, buy_in=%, shot_clock=%, assist=%', 
    p_user_id, p_mode, p_buy_in, p_shot_clock, p_assist;

  -- Validar parâmetros
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER_ID';
  END IF;
  
  IF p_buy_in <= 0 THEN
    RAISE EXCEPTION 'INVALID_BUY_IN';
  END IF;

  -- Verificar/criar wallet do usuário
  SELECT id INTO v_wallet_id 
  FROM public.game_wallets 
  WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.game_wallets (user_id, balance_credits, created_at)
    VALUES (p_user_id, 0, now())
    RETURNING id INTO v_wallet_id;
    
    RAISE LOG 'Created wallet % for user %', v_wallet_id, p_user_id;
  END IF;

  -- Verificar saldo suficiente
  SELECT balance_credits INTO v_current_balance
  FROM public.game_wallets
  WHERE id = v_wallet_id;
  
  IF v_current_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: balance=%, required=%', v_current_balance, p_buy_in;
  END IF;

  -- Gerar código único de entrada
  v_join_code := public.generate_join_code();
  
  -- Garantir que o código é único
  WHILE EXISTS (SELECT 1 FROM public.game_matches WHERE join_code = v_join_code) LOOP
    v_join_code := public.generate_join_code();
  END LOOP;

  -- Criar a partida
  INSERT INTO public.game_matches (
    id,
    game,
    mode, 
    buy_in,
    max_players,
    created_by,
    join_code,
    game_state,
    status,
    rake_pct,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'SINUCA',
    p_mode,
    p_buy_in,
    2, -- sinuca é 1v1
    p_user_id,
    v_join_code,
    jsonb_build_object(
      'shotClockSec', p_shot_clock,
      'assistLevel', p_assist,
      'players', '[]'::jsonb
    ),
    'LOBBY',
    0.05, -- 5% rake
    now(),
    now()
  ) RETURNING id INTO v_match_id;

  -- Debitar créditos da carteira
  UPDATE public.game_wallets
  SET balance_credits = balance_credits - p_buy_in,
      updated_at = now()
  WHERE id = v_wallet_id;

  -- Registrar transação no ledger
  INSERT INTO public.game_ledger (
    user_id,
    wallet_id,
    match_id,
    type,
    amount_credits,
    balance_after,
    description,
    created_at
  ) VALUES (
    p_user_id,
    v_wallet_id,
    v_match_id,
    'MATCH_ENTRY',
    -p_buy_in,
    v_current_balance - p_buy_in,
    'Entry fee for match ' || v_match_id,
    now()
  );

  RAISE LOG 'Match % created successfully with join_code %', v_match_id, v_join_code;

  -- Retornar dados da partida criada
  RETURN json_build_object(
    'matchId', v_match_id,
    'joinCode', v_join_code,
    'status', 'LOBBY',
    'mode', p_mode,
    'buyIn', p_buy_in,
    'gameState', jsonb_build_object(
      'shotClockSec', p_shot_clock,
      'assistLevel', p_assist,
      'players', '[]'::jsonb
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'create_pool_match_tx ERROR: % %', SQLSTATE, SQLERRM;
    RAISE;
END;
$$;
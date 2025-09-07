-- FASE 1: LIMPEZA DE RPCs CONFLITANTES
DROP FUNCTION IF EXISTS public.create_pool_match_tx(text,numeric,integer,text);
DROP FUNCTION IF EXISTS public.create_pool_match_tx(uuid,text,integer,integer,text);
DROP FUNCTION IF EXISTS public.create_pool_match_no_debit(text,numeric,integer,text);

-- FASE 2: FUNÇÕES AUXILIARES

-- Gerador de join_code Base32 sem I/1/O/0 (6 chars)
CREATE OR REPLACE FUNCTION public.generate_join_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    out := out || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
  END LOOP;
  RETURN out;
END;
$$;

-- Índice único para join_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_matches_join_code_unique
ON pool_matches (join_code) WHERE join_code IS NOT NULL;

-- FASE 3: RPC ÚNICA, ALINHADA AO SCHEMA REAL
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
  v_balance numeric;
  v_locked  numeric;
  v_match_id uuid := gen_random_uuid();
  v_join_code text;
  v_try int := 0;
BEGIN
  -- Validação de entrada
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_ID_REQUIRED';
  END IF;
  IF p_mode NOT IN ('CASUAL', 'RANKED') THEN
    RAISE EXCEPTION 'INVALID_MODE';
  END IF;
  IF p_buy_in <= 0 THEN
    RAISE EXCEPTION 'INVALID_BUY_IN';
  END IF;
  IF p_shot_clock < 10 OR p_shot_clock > 90 THEN
    RAISE EXCEPTION 'INVALID_SHOT_CLOCK';
  END IF;
  IF p_assist NOT IN ('NONE', 'SHORT') THEN
    RAISE EXCEPTION 'INVALID_ASSIST';
  END IF;

  -- Lock na carteira do criador
  SELECT balance, locked_balance INTO v_balance, v_locked
    FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  IF v_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  -- Gera join_code único com retry (evita 23505)
  LOOP
    v_try := v_try + 1;
    SELECT public.generate_join_code() INTO v_join_code;
    BEGIN
      -- Debita e trava créditos
      UPDATE user_wallets
         SET balance = balance - p_buy_in,
             locked_balance = locked_balance + p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;

      -- Cria a partida
      INSERT INTO pool_matches(
        id, mode, buy_in, rake_pct, status, max_players, players, join_code,
        creator_user_id, opponent_user_id, shot_clock, rules, created_at, updated_at
      ) VALUES (
        v_match_id,
        p_mode,
        p_buy_in,
        0.05,
        'LOBBY',
        2,
        jsonb_build_array(
          jsonb_build_object('userId', p_user_id, 'seat', 1, 'connected', true, 'ready', false, 'score', 0)
        ),
        v_join_code,
        p_user_id,
        NULL,
        p_shot_clock,
        jsonb_build_object('shotClockSec', p_shot_clock, 'assistLevel', p_assist),
        now(),
        now()
      );

      -- Registra no ledger
      INSERT INTO wallet_ledger(id, user_id, type, amount, reason, match_id, created_at)
      VALUES(gen_random_uuid(), p_user_id, 'DEBIT', p_buy_in, 'BUY_IN', v_match_id, now());

      EXIT; -- sucesso
    EXCEPTION WHEN unique_violation THEN
      IF v_try < 5 THEN
        -- desfaz update de wallet deste loop antes de tentar outro código
        UPDATE user_wallets
           SET balance = balance + p_buy_in,
               locked_balance = locked_balance - p_buy_in,
               updated_at = now()
         WHERE user_id = p_user_id;
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
$$;

-- Permissões de execução
REVOKE ALL ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) TO postgres, service_role;
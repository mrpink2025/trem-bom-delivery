-- LIMPE versões antigas conflitantes
DROP FUNCTION IF EXISTS public.create_pool_match_tx(uuid, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.create_pool_match_tx();

-- Função para join_code (Base32 sem I/1/O/0)
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

-- Índice único (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_matches_join_code_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_matches_join_code_unique ON public.matches (join_code)';
  END IF;
END
$$;

-- RPC ÚNICA (SECURITY DEFINER) – ajuste os nomes se necessário
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
  -- Lock na carteira do criador
  SELECT balance, locked_balance INTO v_balance, v_locked
    FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;
  IF v_balance < p_buy_in THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;

  -- Gera join_code único com retry
  LOOP
    v_try := v_try + 1;
    SELECT public.generate_join_code() INTO v_join_code;

    BEGIN
      UPDATE public.wallets
         SET balance = balance - p_buy_in,
             locked_balance = locked_balance + p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;

      INSERT INTO public.matches (
        id, game, mode, buy_in, rake_pct, status, seats, players, join_code,
        creator_user_id, opponent_user_id, rng_seed, state, created_at, updated_at
      ) VALUES (
        v_match_id,
        'SINUCA',
        p_mode,
        p_buy_in,
        5,
        'LOBBY',
        2,
        jsonb_build_array(
          jsonb_build_object('userId', p_user_id, 'seat', 1, 'connected', true, 'ready', false, 'score', 0)
        ),
        v_join_code,
        p_user_id,
        NULL,
        NULL,
        jsonb_build_object('rules', jsonb_build_object('shotClockSec', p_shot_clock, 'assistLevel', p_assist)),
        now(),
        now()
      );

      INSERT INTO public.ledger(id, user_id, type, amount, reason, match_id, created_at)
      VALUES(gen_random_uuid(), p_user_id, 'CREDIT'::text, p_buy_in * 0, 'INIT_PLACEHOLDER', v_match_id, now());
      INSERT INTO public.ledger(id, user_id, type, amount, reason, match_id, created_at)
      VALUES(gen_random_uuid(), p_user_id, 'DEBIT', p_buy_in, 'BUY_IN', v_match_id, now());

      EXIT; -- sucesso
    EXCEPTION WHEN unique_violation THEN
      -- Desfaz o update da wallet e tenta outro código (até 5x)
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
$$;

REVOKE ALL ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) TO postgres, service_role;
-- 1) Tabelas base (cria se não existirem)
CREATE TABLE IF NOT EXISTS public.game_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 1000,
  locked_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.game_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid,
  match_id uuid,
  type text NOT NULL,         -- 'DEBIT' | 'CREDIT' | 'REFUND' | ...
  amount_credits integer NOT NULL,
  balance_after integer,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 2) Pool matches base (caso não exista; se já existe, mantém)
-- Esperado: public.pool_matches com colunas usadas abaixo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pool_matches') THEN
    CREATE TABLE public.pool_matches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mode text NOT NULL,                   -- 'CASUAL' | 'RANKED'
      buy_in integer NOT NULL,
      rake_pct numeric NOT NULL DEFAULT 0.05,
      status text NOT NULL,                 -- 'LOBBY' | 'COUNTDOWN' | 'LIVE' | 'FINISHED' | 'CANCELLED'
      max_players integer NOT NULL DEFAULT 2,
      creator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      opponent_user_id uuid,
      join_code text UNIQUE,
      rules jsonb NOT NULL DEFAULT '{}'::jsonb,
      shot_clock integer,
      game_phase text NOT NULL DEFAULT 'LOBBY',
      ball_in_hand boolean NOT NULL DEFAULT false,
      players jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      expires_at timestamptz
    );
  END IF;
END$$;

-- 3) Função util para join_code
CREATE OR REPLACE FUNCTION public.generate_join_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; out text := ''; i int;
BEGIN
  FOR i IN 1..6 LOOP out := out || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
  RETURN out;
END$$;

-- 4) Índice único (se necessário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_pool_matches_join_code_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_pool_matches_join_code_unique ON public.pool_matches (join_code);
  END IF;
END$$;

-- 5) RLS seguro (Edge usa service_role e ignora RLS; mas deixamos correto p/ app)
ALTER TABLE public.game_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_ledger  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_wallets' AND policyname='wallets_select_own') THEN
    CREATE POLICY wallets_select_own ON public.game_wallets FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_wallets' AND policyname='wallets_insert_own') THEN
    CREATE POLICY wallets_insert_own ON public.game_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='game_wallets' AND policyname='wallets_update_own') THEN
    CREATE POLICY wallets_update_own ON public.game_wallets FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pool_matches' AND policyname='matches_select_all') THEN
    CREATE POLICY matches_select_all ON public.pool_matches FOR SELECT USING (true);
  END IF;
END $$;

-- 6) Remover RPCs conflitantes
DROP FUNCTION IF EXISTS public.create_pool_match_tx(uuid,text,integer,integer,text);
DROP FUNCTION IF EXISTS public.create_pool_match_tx();

-- 7) RPC DEFINITIVA (SECURITY DEFINER) usando pool_matches + game_wallets
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

  -- trava wallet para leitura/atualização
  SELECT balance INTO v_balance FROM public.game_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'WALLET_NOT_FOUND'; END IF;
  IF v_balance < p_buy_in THEN RAISE EXCEPTION 'INSUFFICIENT_FUNDS'; END IF;

  -- gera join_code único (até 5 tentativas)
  LOOP
    v_try := v_try + 1;
    SELECT public.generate_join_code() INTO v_join_code;

    BEGIN
      -- debita e (se quiser) trava créditos
      UPDATE public.game_wallets
         SET balance = balance - p_buy_in,
             locked_balance = locked_balance + p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;

      -- cria a partida
      INSERT INTO public.pool_matches(
        id, mode, buy_in, rake_pct, status, max_players, creator_user_id, join_code,
        rules, shot_clock, game_phase, ball_in_hand, players, created_at, updated_at, expires_at
      ) VALUES (
        v_match_id,
        p_mode, p_buy_in, 0.05, 'LOBBY', 2, p_user_id, v_join_code,
        jsonb_build_object('shotClockSec', p_shot_clock, 'assistLevel', p_assist),
        p_shot_clock, 'LOBBY', false,
        jsonb_build_array(
          jsonb_build_object('user_id', p_user_id, 'seat', 1, 'ready', false, 'connected', true)
        ),
        now(), now(), now() + interval '15 minutes'
      );

      -- ledger
      INSERT INTO public.game_ledger(user_id, wallet_id, match_id, type, amount_credits, balance_after, description, created_at)
      VALUES(p_user_id, (SELECT id FROM public.game_wallets WHERE user_id=p_user_id),
             v_match_id, 'DEBIT', p_buy_in, (SELECT balance FROM public.game_wallets WHERE user_id=p_user_id),
             'BUY_IN', now());

      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- rollback local e tenta novo join_code
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

-- Permissões de execução
REVOKE ALL ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) TO postgres, service_role;
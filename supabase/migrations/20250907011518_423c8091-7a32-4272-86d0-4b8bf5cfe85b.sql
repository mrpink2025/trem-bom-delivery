-- Create wallets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY,
  balance numeric NOT NULL DEFAULT 0,
  locked_balance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  reason text,
  match_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add join_code column to game_matches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'game_matches' 
    AND column_name = 'join_code'
  ) THEN
    ALTER TABLE public.game_matches ADD COLUMN join_code text;
  END IF;
END
$$;

-- Function to generate join_code (Base32 without I/1/O/0)
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

-- Create unique index for join_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_game_matches_join_code_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_game_matches_join_code_unique ON public.game_matches (join_code)';
  END IF;
END
$$;

-- Drop existing function versions
DROP FUNCTION IF EXISTS public.create_pool_match_tx(uuid, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.create_pool_match_tx();

-- Create the RPC function using correct table names
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
    SELECT public.generate_join_code() INTO v_join_code;

    BEGIN
      -- Update wallet balance
      UPDATE public.wallets
         SET balance = balance - p_buy_in,
             locked_balance = locked_balance + p_buy_in,
             updated_at = now()
       WHERE user_id = p_user_id;

      -- Insert into game_matches using existing structure
      INSERT INTO public.game_matches (
        id, game, mode, buy_in, rake_pct, status, max_players, current_players,
        created_by, winner_user_ids, rng_seed, game_state, join_code,
        created_at, updated_at
      ) VALUES (
        v_match_id,
        'POOL'::game_type,
        p_mode::game_mode,
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
$$;

-- Set permissions
REVOKE ALL ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pool_match_tx(uuid,text,integer,integer,text) TO postgres, service_role;

-- Enable RLS on new tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wallets
CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ledger
CREATE POLICY "Users can view their own transactions" ON public.ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON public.ledger
  FOR INSERT WITH CHECK (true);
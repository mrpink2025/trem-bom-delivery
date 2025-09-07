-- Add unique constraint to game_wallets.user_id to fix ON CONFLICT error
ALTER TABLE public.game_wallets 
ADD CONSTRAINT game_wallets_user_id_key UNIQUE (user_id);
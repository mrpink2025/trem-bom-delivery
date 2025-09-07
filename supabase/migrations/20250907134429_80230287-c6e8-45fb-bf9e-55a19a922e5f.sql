-- Adiciona policy para INSERT na tabela game_wallets
CREATE POLICY "Users can create their own wallet" ON public.game_wallets
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);
-- Adiciona policies para a tabela game_ledger
CREATE POLICY "Users can insert their own ledger entries" ON public.game_ledger
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ledger entries" ON public.game_ledger
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "System can manage ledger entries" ON public.game_ledger
FOR ALL
TO public
USING (is_system_operation())
WITH CHECK (is_system_operation());
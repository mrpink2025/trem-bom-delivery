-- Limpar políticas RLS duplicadas e conflitantes na tabela pool_matches
DROP POLICY IF EXISTS "Authenticated users can create matches" ON pool_matches;
DROP POLICY IF EXISTS "Creator updates own matches" ON pool_matches;
DROP POLICY IF EXISTS "Players can update their own matches" ON pool_matches;
DROP POLICY IF EXISTS "Public matches visible" ON pool_matches;
DROP POLICY IF EXISTS "Users can create pool matches" ON pool_matches;
DROP POLICY IF EXISTS "Users can view matches they participate in" ON pool_matches;
DROP POLICY IF EXISTS "Users can view pool matches they participate in" ON pool_matches;
DROP POLICY IF EXISTS "Users create own matches" ON pool_matches;
DROP POLICY IF EXISTS "matches_select_all" ON pool_matches;

-- Criar políticas RLS limpas e corretas
CREATE POLICY "Anyone can view lobby matches" ON pool_matches
  FOR SELECT
  USING (status = 'LOBBY');

CREATE POLICY "Users can view their own matches" ON pool_matches
  FOR SELECT
  USING (
    creator_user_id = auth.uid() OR 
    opponent_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(players) AS player
      WHERE (player->>'user_id')::uuid = auth.uid() OR (player->>'userId')::uuid = auth.uid()
    )
  );

CREATE POLICY "Users can create matches" ON pool_matches
  FOR INSERT
  WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Participants can update matches" ON pool_matches
  FOR UPDATE
  USING (
    creator_user_id = auth.uid() OR 
    opponent_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(players) AS player
      WHERE (player->>'user_id')::uuid = auth.uid() OR (player->>'userId')::uuid = auth.uid()
    )
  );

CREATE POLICY "System can manage matches" ON pool_matches
  FOR ALL
  USING (is_system_operation())
  WITH CHECK (is_system_operation());
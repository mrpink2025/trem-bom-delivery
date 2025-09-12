-- Fix RLS policy for pool_events to allow reading events for match participants
DROP POLICY IF EXISTS "Users can view events of their matches" ON pool_events;

CREATE POLICY "Users can view events of their matches" ON pool_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pool_matches 
    WHERE pool_matches.id = pool_events.match_id 
    AND (
      pool_matches.creator_user_id = auth.uid() OR 
      pool_matches.opponent_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(pool_matches.players) AS p 
        WHERE (p->>'userId')::uuid = auth.uid() OR (p->>'user_id')::uuid = auth.uid()
      )
    )
  )
);

-- Update pool_matches to properly set opponent_user_id when second player joins
CREATE OR REPLACE FUNCTION set_opponent_on_second_join()
RETURNS TRIGGER AS $$
BEGIN
  -- If players array has exactly 2 players and opponent_user_id is null, set it
  IF jsonb_array_length(NEW.players) = 2 AND NEW.opponent_user_id IS NULL THEN
    -- Get the user_id of the second player (not the creator)
    SELECT (p->>'userId')::uuid INTO NEW.opponent_user_id
    FROM jsonb_array_elements(NEW.players) AS p
    WHERE (p->>'userId')::uuid != NEW.creator_user_id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_opponent_trigger ON pool_matches;
CREATE TRIGGER set_opponent_trigger
  BEFORE UPDATE ON pool_matches
  FOR EACH ROW EXECUTE FUNCTION set_opponent_on_second_join();
-- Clean migration for pool_matches with proper casting

-- First, drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view public matches" ON pool_matches;
DROP POLICY IF EXISTS "Users can view matches by join_code or participation" ON pool_matches;
DROP POLICY IF EXISTS "System can manage matches" ON pool_matches;
DROP POLICY IF EXISTS "Users can create matches" ON pool_matches; 
DROP POLICY IF EXISTS "Creator can update lobby matches" ON pool_matches;
DROP POLICY IF EXISTS "Match participants can update" ON pool_matches;

-- Add new columns
ALTER TABLE pool_matches 
ADD COLUMN IF NOT EXISTS join_code text,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS creator_user_id uuid,
ADD COLUMN IF NOT EXISTS opponent_user_id uuid;

-- Create enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pool_match_status') THEN
    CREATE TYPE pool_match_status AS ENUM ('LOBBY', 'LIVE', 'FINISHED', 'CANCELLED');
  END IF;
END $$;

-- Convert status column carefully
ALTER TABLE pool_matches 
ALTER COLUMN status DROP DEFAULT,
ALTER COLUMN status TYPE pool_match_status USING 
  CASE 
    WHEN status::text = 'LOBBY' THEN 'LOBBY'::pool_match_status
    WHEN status::text = 'LIVE' THEN 'LIVE'::pool_match_status  
    WHEN status::text = 'FINISHED' THEN 'FINISHED'::pool_match_status
    ELSE 'LOBBY'::pool_match_status
  END,
ALTER COLUMN status SET DEFAULT 'LOBBY'::pool_match_status;

-- Add constraints and indices
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_join_code ON pool_matches(join_code) 
  WHERE join_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pool_matches_status ON pool_matches(status);
CREATE INDEX IF NOT EXISTS idx_pool_matches_expires_at ON pool_matches(expires_at);
CREATE INDEX IF NOT EXISTS idx_pool_matches_creator ON pool_matches(creator_user_id);

-- Function to generate unique join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- No confusing chars
  result text;
  attempts int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    IF NOT EXISTS (SELECT 1 FROM pool_matches WHERE join_code = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique join code';
    END IF;
  END LOOP;
END;
$$;

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_lobbies()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  expired_count int := 0;
  match_record record;
BEGIN
  FOR match_record IN 
    SELECT id, buy_in, players
    FROM pool_matches 
    WHERE status = 'LOBBY'::pool_match_status 
      AND expires_at < now()
  LOOP
    FOR i IN 0..jsonb_array_length(match_record.players) - 1 LOOP
      DECLARE
        player_data jsonb := match_record.players->i;
        player_id uuid := (player_data->>'userId')::uuid;
      BEGIN
        UPDATE user_wallets 
        SET balance = balance + match_record.buy_in,
            locked_balance = locked_balance - match_record.buy_in,
            updated_at = now()
        WHERE user_id = player_id;
        
        INSERT INTO wallet_ledger (user_id, type, amount, reason, description, match_id, created_at)
        VALUES (
          player_id, 
          'CREDIT', 
          match_record.buy_in, 
          'REFUND', 
          'Lobby timeout - match expired',
          match_record.id,
          now()
        );
      END;
    END LOOP;
    
    UPDATE pool_matches 
    SET status = 'CANCELLED'::pool_match_status, updated_at = now()
    WHERE id = match_record.id;
    
    expired_count := expired_count + 1;
  END LOOP;
  
  RETURN expired_count;
END;
$$;

-- Recreate RLS policies with proper casting
CREATE POLICY "Users can view matches" ON pool_matches 
  FOR SELECT USING (
    status IN ('LOBBY'::pool_match_status, 'LIVE'::pool_match_status) OR 
    creator_user_id = auth.uid() OR 
    opponent_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(players) AS player 
      WHERE (player->>'userId')::uuid = auth.uid()
    )
  );

CREATE POLICY "System operations" ON pool_matches 
  FOR ALL USING (is_system_operation())
  WITH CHECK (is_system_operation());

CREATE POLICY "Users create matches" ON pool_matches 
  FOR INSERT WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Creator updates lobby" ON pool_matches 
  FOR UPDATE USING (
    auth.uid() = creator_user_id AND 
    status IN ('LOBBY'::pool_match_status, 'CANCELLED'::pool_match_status)
  );
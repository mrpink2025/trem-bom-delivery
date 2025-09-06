-- Fix the RPC functions to avoid ON CONFLICT errors
-- Drop and recreate the functions with proper UPSERT handling

DROP FUNCTION IF EXISTS update_player_connection(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS set_player_ready(UUID, UUID, BOOLEAN);

-- Function to update player connection status
CREATE OR REPLACE FUNCTION update_player_connection(
  match_id_param UUID,
  user_id_param UUID,
  connected_param BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_players JSONB;
  updated_players JSONB := '[]'::jsonb;
  player_record JSONB;
  found_player BOOLEAN := false;
BEGIN
  -- Get current match players
  SELECT players INTO current_players
  FROM pool_matches 
  WHERE id = match_id_param;
  
  IF current_players IS NULL THEN
    current_players := '[]'::jsonb;
  END IF;
  
  -- Update or add player
  FOR i IN 0..(jsonb_array_length(current_players) - 1) LOOP
    player_record := current_players -> i;
    
    IF (player_record ->> 'userId')::uuid = user_id_param THEN
      -- Update existing player
      player_record := jsonb_set(player_record, '{connected}', to_jsonb(connected_param));
      found_player := true;
    END IF;
    
    updated_players := updated_players || player_record;
  END LOOP;
  
  -- If player not found, add them
  IF NOT found_player THEN
    updated_players := updated_players || jsonb_build_object(
      'userId', user_id_param,
      'seat', jsonb_array_length(updated_players) + 1,
      'connected', connected_param,
      'ready', false,
      'mmr', 1000
    );
  END IF;
  
  -- Update the match
  UPDATE pool_matches 
  SET players = updated_players
  WHERE id = match_id_param;
END;
$$;

-- Function to set player ready status
CREATE OR REPLACE FUNCTION set_player_ready(
  match_id_param UUID,
  user_id_param UUID,
  ready_param BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_players JSONB;
  updated_players JSONB := '[]'::jsonb;
  player_record JSONB;
BEGIN
  -- Get current match players
  SELECT players INTO current_players
  FROM pool_matches 
  WHERE id = match_id_param;
  
  IF current_players IS NULL THEN
    RETURN;
  END IF;
  
  -- Update player ready status
  FOR i IN 0..(jsonb_array_length(current_players) - 1) LOOP
    player_record := current_players -> i;
    
    IF (player_record ->> 'userId')::uuid = user_id_param THEN
      -- Update existing player
      player_record := jsonb_set(player_record, '{ready}', to_jsonb(ready_param));
    END IF;
    
    updated_players := updated_players || player_record;
  END LOOP;
  
  -- Update the match
  UPDATE pool_matches 
  SET players = updated_players
  WHERE id = match_id_param;
END;
$$;
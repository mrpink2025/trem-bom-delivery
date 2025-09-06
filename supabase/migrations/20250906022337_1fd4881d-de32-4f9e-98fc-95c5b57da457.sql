-- Add RPC functions for pool match player management

-- Function to update player connection status
CREATE OR REPLACE FUNCTION update_player_connection(
  match_id UUID,
  user_id UUID, 
  is_connected BOOLEAN
) RETURNS JSONB AS $$
DECLARE
  current_players JSONB;
  updated_players JSONB;
BEGIN
  -- Get current players array
  SELECT players INTO current_players 
  FROM pool_matches 
  WHERE id = match_id;
  
  -- If no players array exists, create empty one
  IF current_players IS NULL THEN
    current_players := '[]'::jsonb;
  END IF;
  
  -- Update the specific player's connection status
  SELECT jsonb_agg(
    CASE 
      WHEN (player->>'userId')::UUID = user_id THEN
        player || jsonb_build_object('connected', is_connected)
      ELSE
        player
    END
  ) INTO updated_players
  FROM jsonb_array_elements(current_players) AS player;
  
  -- If player not found in array, add them
  IF updated_players IS NULL OR jsonb_array_length(updated_players) = 0 THEN
    updated_players := jsonb_build_array(
      jsonb_build_object(
        'userId', user_id,
        'seat', 1,
        'connected', is_connected,
        'ready', false,
        'mmr', 1200
      )
    );
  END IF;
  
  RETURN updated_players;
END;
$$ LANGUAGE plpgsql;

-- Function to set player ready status
CREATE OR REPLACE FUNCTION set_player_ready(
  match_id UUID,
  user_id UUID,
  is_ready BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  current_players JSONB;
  updated_players JSONB;
BEGIN
  -- Get current players array
  SELECT players INTO current_players 
  FROM pool_matches 
  WHERE id = match_id;
  
  -- If no players array exists, return false
  IF current_players IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the specific player's ready status
  SELECT jsonb_agg(
    CASE 
      WHEN (player->>'userId')::UUID = user_id THEN
        player || jsonb_build_object('ready', is_ready)
      ELSE
        player
    END
  ) INTO updated_players
  FROM jsonb_array_elements(current_players) AS player;
  
  -- Update the match with new players array
  UPDATE pool_matches 
  SET players = updated_players,
      updated_at = now()
  WHERE id = match_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
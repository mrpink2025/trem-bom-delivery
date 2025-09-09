-- Function to initialize pool match game state with default ball positions
CREATE OR REPLACE FUNCTION initialize_pool_match_state(match_id_param UUID)
RETURNS VOID AS $$
DECLARE
  default_balls JSONB;
BEGIN
  -- Default 8-ball pool setup
  default_balls := '[
    {"id": 0, "x": 200, "y": 200, "vx": 0, "vy": 0, "type": "CUE", "number": 0, "inPocket": false, "color": "#ffffff"},
    {"id": 1, "x": 600, "y": 200, "vx": 0, "vy": 0, "type": "SOLID", "number": 1, "inPocket": false, "color": "#ffff00"},
    {"id": 2, "x": 620, "y": 185, "vx": 0, "vy": 0, "type": "SOLID", "number": 2, "inPocket": false, "color": "#0000ff"},
    {"id": 3, "x": 620, "y": 215, "vx": 0, "vy": 0, "type": "SOLID", "number": 3, "inPocket": false, "color": "#ff0000"},
    {"id": 4, "x": 640, "y": 170, "vx": 0, "vy": 0, "type": "SOLID", "number": 4, "inPocket": false, "color": "#800080"},
    {"id": 5, "x": 640, "y": 230, "vx": 0, "vy": 0, "type": "SOLID", "number": 5, "inPocket": false, "color": "#ff6600"},
    {"id": 6, "x": 640, "y": 200, "vx": 0, "vy": 0, "type": "SOLID", "number": 6, "inPocket": false, "color": "#00aa00"},
    {"id": 7, "x": 660, "y": 155, "vx": 0, "vy": 0, "type": "SOLID", "number": 7, "inPocket": false, "color": "#660066"},
    {"id": 8, "x": 660, "y": 200, "vx": 0, "vy": 0, "type": "EIGHT", "number": 8, "inPocket": false, "color": "#000000"},
    {"id": 9, "x": 660, "y": 245, "vx": 0, "vy": 0, "type": "STRIPE", "number": 9, "inPocket": false, "color": "#ffff00"},
    {"id": 10, "x": 680, "y": 140, "vx": 0, "vy": 0, "type": "STRIPE", "number": 10, "inPocket": false, "color": "#0000ff"},
    {"id": 11, "x": 680, "y": 170, "vx": 0, "vy": 0, "type": "STRIPE", "number": 11, "inPocket": false, "color": "#ff0000"},
    {"id": 12, "x": 680, "y": 200, "vx": 0, "vy": 0, "type": "STRIPE", "number": 12, "inPocket": false, "color": "#800080"},
    {"id": 13, "x": 680, "y": 230, "vx": 0, "vy": 0, "type": "STRIPE", "number": 13, "inPocket": false, "color": "#ff6600"},
    {"id": 14, "x": 680, "y": 260, "vx": 0, "vy": 0, "type": "STRIPE", "number": 14, "inPocket": false, "color": "#00aa00"},
    {"id": 15, "x": 700, "y": 200, "vx": 0, "vy": 0, "type": "STRIPE", "number": 15, "inPocket": false, "color": "#660066"}
  ]'::jsonb;

  -- Update match with initial game state
  UPDATE pool_matches 
  SET game_state = jsonb_build_object(
    'balls', default_balls,
    'phase', 'BREAK',
    'currentPlayer', 1,
    'ballInHand', false,
    'gameType', '8BALL'
  )
  WHERE id = match_id_param 
    AND (game_state IS NULL OR game_state = '{}'::jsonb);
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize all current live matches with empty states
DO $$
DECLARE
  match_record RECORD;
BEGIN
  FOR match_record IN 
    SELECT id FROM pool_matches 
    WHERE status = 'LIVE' 
    AND (game_state IS NULL OR game_state = '{}'::jsonb)
  LOOP
    PERFORM initialize_pool_match_state(match_record.id);
  END LOOP;
END $$;
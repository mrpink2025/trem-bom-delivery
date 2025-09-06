-- Start all matches where both players are ready
UPDATE pool_matches 
SET status = 'LIVE',
    balls = '[
      {"id":0,"x":200,"y":200,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#FFFFFF","type":"CUE","inPocket":false},
      {"id":8,"x":600,"y":200,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#000000","number":8,"type":"EIGHT","inPocket":false},
      {"id":1,"x":650,"y":175,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#FFD700","number":1,"type":"SOLID","inPocket":false},
      {"id":2,"x":650,"y":225,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#0066CC","number":2,"type":"SOLID","inPocket":false},
      {"id":3,"x":700,"y":150,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#FF0000","number":3,"type":"SOLID","inPocket":false},
      {"id":4,"x":700,"y":200,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#9900CC","number":4,"type":"SOLID","inPocket":false},
      {"id":5,"x":700,"y":250,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#FF6600","number":5,"type":"SOLID","inPocket":false},
      {"id":6,"x":750,"y":125,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#009900","number":6,"type":"SOLID","inPocket":false},
      {"id":7,"x":750,"y":275,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#660000","number":7,"type":"SOLID","inPocket":false},
      {"id":9,"x":750,"y":175,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#FFD700","number":9,"type":"STRIPE","inPocket":false},
      {"id":10,"x":750,"y":225,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#0066CC","number":10,"type":"STRIPE","inPocket":false},
      {"id":11,"x":800,"y":100,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#FF0000","number":11,"type":"STRIPE","inPocket":false},
      {"id":12,"x":800,"y":150,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#9900CC","number":12,"type":"STRIPE","inPocket":false},
      {"id":13,"x":800,"y":250,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#FF6600","number":13,"type":"STRIPE","inPocket":false},
      {"id":14,"x":800,"y":300,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#009900","number":14,"type":"STRIPE","inPocket":false},
      {"id":15,"x":850,"y":200,"vx":0,"vy":0,"wx":0,"wy":0,"color":"#660000","number":15,"type":"STRIPE","inPocket":false}
    ]'::jsonb,
    game_phase = 'BREAK',
    ball_in_hand = false,
    updated_at = now()
WHERE status = 'LOBBY' 
  AND jsonb_array_length(players) = 2
  AND (players->0->>'ready')::boolean = true 
  AND (players->1->>'ready')::boolean = true;
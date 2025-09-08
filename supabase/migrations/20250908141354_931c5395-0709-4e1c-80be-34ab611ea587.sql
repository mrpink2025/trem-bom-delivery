-- Ensure game_state column has proper structure for shooting
UPDATE public.pool_matches 
SET game_state = COALESCE(game_state, '{}'::jsonb) || jsonb_build_object(
  'balls', COALESCE((game_state->>'balls')::jsonb, '[]'::jsonb),
  'turnUserId', COALESCE(game_state->>'turnUserId', turn_user_id)
)
WHERE game_state IS NULL OR NOT (game_state ? 'balls');
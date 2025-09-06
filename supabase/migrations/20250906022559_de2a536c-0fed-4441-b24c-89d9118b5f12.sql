-- Fix function search path warnings for security
ALTER FUNCTION update_player_connection(UUID, UUID, BOOLEAN) SET search_path = public, pg_temp;
ALTER FUNCTION set_player_ready(UUID, UUID, BOOLEAN) SET search_path = public, pg_temp;
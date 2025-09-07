-- Clean up all existing LOBBY matches to start fresh
DELETE FROM pool_matches WHERE status = 'LOBBY';
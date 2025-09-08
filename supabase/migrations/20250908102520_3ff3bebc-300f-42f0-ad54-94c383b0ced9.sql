-- Limpar todos os jogos em andamento
DELETE FROM pool_matches WHERE TRUE;
DELETE FROM game_matches WHERE TRUE;
DELETE FROM match_players WHERE TRUE;
-- Concede permissões para a função create_pool_match_tx
GRANT EXECUTE ON FUNCTION public.create_pool_match_tx(uuid, text, integer, integer, text) TO public;
GRANT EXECUTE ON FUNCTION public.create_pool_match_tx(uuid, text, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pool_match_tx(uuid, text, integer, integer, text) TO anon;
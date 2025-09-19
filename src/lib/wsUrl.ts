export function wsUrlForFunction(fnName: string) {
  const supaUrl = 'https://ighllleypgbkluhcihvs.supabase.co'; // Direct URL since VITE_ vars not supported
  if (!supaUrl) throw new Error('SUPABASE_URL ausente');
  const host = new URL(supaUrl).host; // ighllleypgbkluhcihvs.supabase.co
  // CORRIGIDO: WS em functions não inclui /functions/v1/, apenas o nome da função
  return `wss://${host.replace('.supabase.co', '.functions.supabase.co')}/${fnName}`;
}
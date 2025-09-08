export function wsUrlForFunction(fnName: string) {
  const supaUrl = 'https://ighllleypgbkluhcihvs.supabase.co'; // Direct URL since VITE_ vars not supported
  if (!supaUrl) throw new Error('SUPABASE_URL ausente');
  const host = new URL(supaUrl).host; // ighllleypgbkluhcihvs.supabase.co
  // WS em functions => sempre inclui /functions/v1/<fnName>
  return `wss://${host.replace('.supabase.co', '.functions.supabase.co')}/functions/v1/${fnName}`;
}
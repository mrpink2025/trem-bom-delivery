import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS_ALLOW_ORIGIN = Deno.env.get("CORS_ALLOW_ORIGIN") || ""; // prod: seu domínio; vazio => ecoa o Origin
const EDGE_DEBUG = Deno.env.get("EDGE_DEBUG") === "true";           // true => inclui msg/details no 500

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  const allowOrigin = CORS_ALLOW_ORIGIN || origin;
  const reqHeaders = req.headers.get("access-control-request-headers")
    || "authorization, content-type, apikey, x-client-info, x-client-version, x-supabase-authorization, x-debug";
  const reqMethod = req.headers.get("access-control-request-method") || "POST";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": `${reqMethod}, OPTIONS, POST`,
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  };
}

function json(status: number, body: any, req: Request, requestId?: string, debug = false) {
  const expose = EDGE_DEBUG || debug;
  const safe = expose ? body : { error: body?.error, fieldErrors: body?.fieldErrors };
  return new Response(JSON.stringify({ requestId, ...safe }), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

async function getUserIdFromAuth(authHeader: string): Promise<string> {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error("UNAUTHENTICATED");
  return data.user.id;
}

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") { const m = v.match(/\d+/); if (m) return parseInt(m[0], 10); }
  return null;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const debug = req.headers.get("x-debug") === "1" || new URL(req.url).searchParams.get("debug") === "1";
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== "POST")   return json(405, { error: "METHOD_NOT_ALLOWED" }, req, requestId, debug);
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[pool-match-create] MISSING_ENV", { requestId });
      return json(500, { error: "MISSING_ENV", msg: "SUPABASE_URL/SERVICE_ROLE não definidos" }, req, requestId, debug);
    }

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json(401, { error: "UNAUTHENTICATED" }, req, requestId, debug);

    // Body compatível: plano ou rules.{shotClockSec,assistLevel}
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;
    const buyIn = toInt(body?.buyIn);
    const shotClock = toInt(body?.rules?.shotClockSec ?? body?.shotClockSec ?? body?.shotClock);
    const assistRaw = body?.rules?.assistLevel ?? body?.assistLevel;
    const assist = typeof assistRaw === "string" ? assistRaw.toUpperCase() : assistRaw;

    // Validação
    const fieldErrors: Record<string, string> = {};
    if (!["CASUAL", "RANKED"].includes(mode)) fieldErrors.mode = "invalid";
    if (!(typeof buyIn === "number") || !Number.isInteger(buyIn) || buyIn <= 0) fieldErrors.buyIn = "invalid";
    if (!(typeof shotClock === "number") || !Number.isInteger(shotClock) || shotClock < 10 || shotClock > 90) fieldErrors.shotClockSec = "invalid";
    if (!(typeof assist === "string") || !["NONE", "SHORT"].includes(assist)) fieldErrors.assistLevel = "invalid";
    if (Object.keys(fieldErrors).length) {
      console.error("[pool-match-create] 422", { requestId, fieldErrors });
      return json(422, { error: "VALIDATION_ERROR", fieldErrors }, req, requestId, debug);
    }

    // userId
    let userId: string;
    try { userId = await getUserIdFromAuth(auth); }
    catch { return json(401, { error: "UNAUTHENTICATED" }, req, requestId, debug); }

    // Chamada RPC
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await sb.rpc("create_pool_match_tx", {
      p_user_id: userId,
      p_mode: mode,
      p_buy_in: buyIn!,
      p_shot_clock: shotClock!,
      p_assist: assist!,
    });

    if (error) {
      const info = { code: (error as any).code || "", msg: (error as any).message || String(error), details: (error as any).details, hint: (error as any).hint };
      console.error("[pool-match-create] RPC_ERROR", { requestId, ...info });

      if (info.msg.includes("INSUFFICIENT_FUNDS")) return json(409, { error: "INSUFFICIENT_FUNDS", ...info }, req, requestId, debug);
      if (info.msg.includes("WALLET_NOT_FOUND"))   return json(404, { error: "WALLET_NOT_FOUND",   ...info }, req, requestId, debug);
      if (info.code === "23505" || info.msg.includes("RETRY_JOIN_CODE")) return json(503, { error: "RETRY_JOIN_CODE", ...info }, req, requestId, debug);
      return json(500, { error: "INTERNAL", ...info }, req, requestId, debug);
    }

    return json(201, { ...(data ?? {}) }, req, requestId, debug);
  } catch (e) {
    const err = String(e);
    console.error("[pool-match-create] CRASH", { requestId, err });
    return json(500, { error: "INTERNAL", msg: err }, req, requestId, debug);
  }
});
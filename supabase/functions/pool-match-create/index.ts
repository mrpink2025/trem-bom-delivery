// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Opcional: defina em prod ex.: "https://seu-dominio.com"
// Em dev, deixaremos dinâmico ecoando o Origin do request.
const CORS_ALLOW_ORIGIN = Deno.env.get("CORS_ALLOW_ORIGIN") || "";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  // Se CORS_ALLOW_ORIGIN vier vazio -> ecoa o origin na resposta (dev)
  // Se vier preenchido -> usa o valor fixo (prod)
  const allowOrigin = CORS_ALLOW_ORIGIN ? CORS_ALLOW_ORIGIN : origin;

  // Pega exatamente o que o browser pediu no preflight
  const reqHeaders = req.headers.get("access-control-request-headers")
    // fallback seguro cobrindo supabase-js
    || "authorization, content-type, apikey, x-client-info, x-client-version, x-supabase-authorization";

  const reqMethod  = req.headers.get("access-control-request-method") || "POST";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": `${reqMethod}, OPTIONS, POST`,
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
    // Se precisar cookies/credenciais: "Access-Control-Allow-Credentials": "true"
  };
}

function json(status: number, body: unknown, req: Request, requestId?: string) {
  return new Response(JSON.stringify({ requestId, ...body }), {
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
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return null;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  try {
    // Sempre responda o preflight com os headers solicitados
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    if (req.method !== "POST") {
      return json(405, { error: "METHOD_NOT_ALLOWED" }, req, requestId);
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[pool-match-create] MISSING_ENV", { requestId });
      return json(500, { error: "MISSING_ENV" }, req, requestId);
    }

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json(401, { error: "UNAUTHENTICATED" }, req, requestId);
    }

    // Parse body (+ compat com body.rules.*)
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;
    const buyIn = toInt(body?.buyIn);
    const shotClock = toInt(body?.rules?.shotClockSec ?? body?.shotClockSec ?? body?.shotClock);
    const assistRaw = body?.rules?.assistLevel ?? body?.assistLevel;
    const assist = typeof assistRaw === "string" ? assistRaw.toUpperCase() : assistRaw;

    // Validação
    const fieldErrors: Record<string, string> = {};
    if (!["CASUAL","RANKED"].includes(mode)) fieldErrors.mode = "invalid";
    if (!(typeof buyIn === "number") || !Number.isInteger(buyIn) || buyIn <= 0) fieldErrors.buyIn = "invalid";
    if (!(typeof shotClock === "number") || !Number.isInteger(shotClock) || shotClock < 10 || shotClock > 90) fieldErrors.shotClockSec = "invalid";
    if (!(typeof assist === "string") || !["NONE","SHORT"].includes(assist)) fieldErrors.assistLevel = "invalid";

    if (Object.keys(fieldErrors).length) {
      console.error("[pool-match-create] 422 VALIDATION_ERROR", { requestId, fieldErrors });
      return json(422, { error: "VALIDATION_ERROR", fieldErrors }, req, requestId);
    }

    // Autenticação do usuário
    let userId: string;
    try {
      userId = await getUserIdFromAuth(auth);
    } catch {
      return json(401, { error: "UNAUTHENTICATED" }, req, requestId);
    }

    // Chama a RPC definitiva
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await sb.rpc("create_pool_match_tx", {
      p_user_id: userId,
      p_mode: mode,
      p_buy_in: buyIn!,
      p_shot_clock: shotClock!,
      p_assist: assist!
    });

    if (error) {
      const code = (error as any).code || "";
      const msg  = (error as any).message || String(error);
      console.error("[pool-match-create] RPC_ERROR", { requestId, code, msg });

      if (msg.includes("INSUFFICIENT_FUNDS")) return json(409, { error: "INSUFFICIENT_FUNDS" }, req, requestId);
      if (msg.includes("WALLET_NOT_FOUND"))   return json(404, { error: "WALLET_NOT_FOUND"   }, req, requestId);
      if (code === "23505" || msg.includes("RETRY_JOIN_CODE")) return json(503, { error: "RETRY_JOIN_CODE" }, req, requestId);
      return json(500, { error: "INTERNAL" }, req, requestId);
    }

    return json(201, { ...(data ?? {}) }, req, requestId);
  } catch (e) {
    console.error("[pool-match-create] CRASH", { requestId, err: String(e) });
    return json(500, { error: "INTERNAL" }, req, requestId);
  }
});
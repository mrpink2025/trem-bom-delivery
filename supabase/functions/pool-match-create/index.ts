// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS_ORIGIN = Deno.env.get("CORS_ALLOW_ORIGIN") || "*"; // ajuste p/ domínio em prod

function cors() {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}
function json(status: number, body: unknown, requestId?: string) {
  return new Response(JSON.stringify({ requestId, ...body }), {
    status,
    headers: { "content-type": "application/json", ...cors() },
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
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    if (req.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" }, requestId);
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[pool-match-create] MISSING_ENV", { requestId });
      return json(500, { error: "MISSING_ENV" }, requestId);
    }

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json(401, { error: "UNAUTHENTICATED" }, requestId);

    let userId: string;
    try { userId = await getUserIdFromAuth(auth); }
    catch { return json(401, { error: "UNAUTHENTICATED" }, requestId); }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;
    const buyIn = toInt(body?.buyIn);
    const shotClock = toInt(body?.rules?.shotClockSec ?? body?.shotClockSec ?? body?.shotClock);
    const assistRaw = body?.rules?.assistLevel ?? body?.assistLevel;
    const assist = typeof assistRaw === "string" ? assistRaw.toUpperCase() : assistRaw;

    const fieldErrors: Record<string, string> = {};
    if (!["CASUAL","RANKED"].includes(mode)) fieldErrors.mode = "invalid";
    if (!(typeof buyIn === "number") || !Number.isInteger(buyIn) || buyIn <= 0) fieldErrors.buyIn = "invalid";
    if (!(typeof shotClock === "number") || !Number.isInteger(shotClock) || shotClock < 10 || shotClock > 90) fieldErrors.shotClockSec = "invalid";
    if (!(typeof assist === "string") || !["NONE","SHORT"].includes(assist)) fieldErrors.assistLevel = "invalid";
    if (Object.keys(fieldErrors).length) {
      console.error("[pool-match-create] 422 VALIDATION_ERROR", { requestId, fieldErrors, body });
      return json(422, { error: "VALIDATION_ERROR", fieldErrors }, requestId);
    }

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
      const msg = (error as any).message || String(error);
      console.error("[pool-match-create] RPC_ERROR", { requestId, code, msg });
      if (msg.includes("INSUFFICIENT_FUNDS")) return json(409, { error: "INSUFFICIENT_FUNDS" }, requestId);
      if (msg.includes("WALLET_NOT_FOUND"))   return json(404, { error: "WALLET_NOT_FOUND" }, requestId);
      if (code === "23505" || msg.includes("RETRY_JOIN_CODE")) return json(503, { error: "RETRY_JOIN_CODE" }, requestId);
      return json(500, { error: "INTERNAL" }, requestId);
    }

    return json(201, { ...(data ?? {}) }, requestId);
  } catch (e) {
    console.error("[pool-match-create] CRASH", { requestId, err: String(e) });
    return json(500, { error: "INTERNAL" }, requestId);
  }
});
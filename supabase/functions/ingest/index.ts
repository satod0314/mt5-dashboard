/**
 * ingest (APIキー＋任意でAuthorization)
 * - x-api-key が INGEST_API_KEY と一致したときだけ受付
 * - JWT必須の環境では Authorization: Bearer <anon key> を付ければOK
 * - 失敗理由は常にJSONで返す
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_KEY   = Deno.env.get("INGEST_API_KEY")!;
const supa = createClient(SUPABASE_URL, SERVICE_KEY);

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers });

  try {
    // 1) APIキー検証
    const key = req.headers.get("x-api-key");
    if (!key || key !== INGEST_KEY) {
      return json({ code: 401, message: "Unauthorized(x-api-key)" }, 401);
    }

    // 2) JSONパース
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ code: 400, message: "Bad JSON" }, 400);
    }

    // 3) 必須チェック
    const owner_id = body?.owner_id;
    const account_login = Number(body?.account_login);
    if (!owner_id || !account_login || !Number.isFinite(account_login)) {
      return json({ code: 400, message: "Missing owner_id/account_login" }, 400);
    }

    // 4) ts_utc を安全にDate化（未指定→Now、秒/ミリ秒/ISO対応）
    const ts_utc = normalizeDate(body?.ts_utc);

    // 5) 行を組み立て
    const row = {
      owner_id,
      account_login,
      broker: body?.broker ?? null,
      tag: body?.tag ?? null,
      currency: body?.currency ?? null,
      balance: toNum(body?.balance),
      equity: toNum(body?.equity),
      profit_float: toNum(body?.profit_float),
      margin: toNum(body?.margin),
      reason: body?.reason ?? null,
      ts_utc,
    };

    // 6) 挿入
    const { error } = await supa.from("snapshots_hi").insert(row);
    if (error) {
      console.error("DB insert error:", error.message);
      return json({ code: "DB_ERROR", message: error.message }, 500);
    }

    return json({ ok: true });
  } catch (e: any) {
    console.error("Unhandled:", e?.message ?? e);
    return json({ code: "UNHANDLED", message: String(e?.message ?? e) }, 500);
  }
});

function toNum(v: any) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(v: any): Date {
  if (v == null) return new Date();
  try {
    if (typeof v === "number") {
      // 10桁(秒) or 13桁(ミリ秒)
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

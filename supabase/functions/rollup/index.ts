
/**
 * supabase/functions/rollup/index.ts
 * - 直前1時間の「末尾の値」を snapshots_hr に upsert
 * - 任意：SHEETS_WEBHOOK_URL へPOSTしてスプシにAppend
 * - 48時間より古い snapshots_hi を削除（TimescaleDBなしのローテーション）
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHEETS_WEBHOOK_URL = Deno.env.get("SHEETS_WEBHOOK_URL") || "";

serve(async (_req) => {
  try {
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    // 対象時間帯：直前の1時間
    const now = new Date();
    const prevHourEnd = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      now.getUTCHours(), 0, 0, 0
    ));
    const prevHourStart = new Date(prevHourEnd.getTime() - 60*60*1000);

    // 1) 末尾値を取得（RPC）
    const { data, error } = await supa.rpc("rollup_last_points", {
      p_start: prevHourStart.toISOString(),
      p_end: prevHourEnd.toISOString()
    });
    if (error) return new Response("rpc error: " + error.message, { status: 500 });

    // 2) snapshots_hr へ upsert
    if (Array.isArray(data) && data.length > 0) {
      const upserts = data.map((r:any) => ({
        hour_utc: prevHourEnd.toISOString(),
        owner_id: r.owner_id,
        account_login: r.account_login,
        equity_last: r.equity,
        balance_last: r.balance,
        profit_last: r.profit_float
      }));
      const { error: upErr } = await supa.from("snapshots_hr").upsert(upserts);
      if (upErr) return new Response("upsert error: " + upErr.message, { status: 500 });

      // 3) スプシへ（任意）
      if (SHEETS_WEBHOOK_URL) {
        await fetch(SHEETS_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hour_utc: prevHourEnd.toISOString(), rows: upserts })
        }).catch(()=>{});
      }
    }

    // 4) 48hより古い hi を削除（毎時実行でOK）
    const cutoff = new Date(Date.now() - 48*3600*1000).toISOString();
    const { error: delErr } = await supa
      .from("snapshots_hi")
      .delete()
      .lt("ts_utc", cutoff);
    if (delErr) return new Response("delete error: " + delErr.message, { status: 500 });

    return new Response("ok");
  } catch (e) {
    return new Response(String(e?.message ?? e), { status: 500 });
  }
});

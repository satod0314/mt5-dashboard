// supabase/functions/sheet-daily-jst08/index.ts
// 目的: 毎日 JST 08:00 時点の各口座残高を Google スプレッドシートに追記する
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// JST 08:00 の UTC を算出（今日のJST日付で08:00）
function jst08TodayUtc(): Date {
  const nowJst = new Date(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
  const y = nowJst.getFullYear()
  const m = nowJst.getMonth()
  const d = nowJst.getDate()
  // JST 08:00 は UTC では前日 23:00
  return new Date(Date.UTC(y, m, d, 23, 0, 0))
}
function dateJstString(dtUtc: Date): string {
  const jst = new Date(dtUtc.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
  const y = jst.getFullYear()
  const m = ('0' + (jst.getMonth() + 1)).slice(-2)
  const d = ('0' + jst.getDate()).slice(-2)
  return `${y}-${m}-${d}`
}

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SHEETS_WEBHOOK_URL = Deno.env.get('SHEETS_WEBHOOK_URL')!

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ ok:false, error:'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 })
    }
    if (!SHEETS_WEBHOOK_URL) {
      return new Response(JSON.stringify({ ok:false, error:'Missing SHEETS_WEBHOOK_URL' }), { status: 500 })
    }

    // Cron は毎時にしておき、ここで「UTC 23時（= JST08:00）」のみ実行する
    const isManual = new URL(req.url).searchParams.get('force') === '1'
    const nowUtc = new Date()
    if (!isManual && nowUtc.getUTCHours() !== 23) {
      return new Response(JSON.stringify({ ok:true, skipped:true, reason:'not 23UTC' }), { status: 200 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const targetUtc = jst08TodayUtc()
    const dateJst = dateJstString(targetUtc)
    const targetIso = targetUtc.toISOString()

    // 取得窓を少し広げて（36時間分）対象時刻までのデータを拾う
    const windowStart = new Date(targetUtc.getTime() - 36 * 60 * 60 * 1000).toISOString()

    // 必要カラムだけ取得（大量防止のため窓を絞る）
    const { data, error } = await supabase
      .from('snapshots_hi')
      .select('owner_id,account_login,broker,tag,currency,balance,equity,profit_float,margin,ts_utc')
      .gte('ts_utc', windowStart)      // 36時間前～
      .lte('ts_utc', targetIso)        // ～JST08:00(=UTC23:00)
      .order('ts_utc', { ascending: false })
      .limit(200000) // 余裕を持たせる（必要なら調整）

    if (error) {
      return new Response(JSON.stringify({ ok:false, step:'select', error: String(error) }), { status: 500 })
    }

    // 口座ごとに「targetIso 以下で最も新しい1件」を選ぶ
    type R = {
      owner_id: string
      account_login: number
      broker?: string | null
      tag?: string | null
      currency?: string | null
      balance?: number | null
      equity?: number | null
      profit_float?: number | null
      margin?: number | null
      ts_utc: string
    }
    const latestByAccount = new Map<string, R>()
    for (const r of (data ?? []) as R[]) {
      const key = `${r.owner_id}::${r.account_login}`
      if (!latestByAccount.has(key)) {
        // ts_utc は ISO 文字列想定（timestamptz でも ISO で返る）
        latestByAccount.set(key, r)
      }
    }

    const rows = Array.from(latestByAccount.values()).map(r => ({
      date_jst: dateJst,
      time_jst: '08:00',
      owner_id: r.owner_id,
      account_login: r.account_login,
      broker: r.broker ?? '',
      tag: r.tag ?? '',
      currency: r.currency ?? '',
      balance: Number(r.balance ?? 0),
      equity: Number(r.equity ?? 0),
      profit_float: Number(r.profit_float ?? 0),
      margin: Number(r.margin ?? 0),
      ts_utc_iso: r.ts_utc
    }))

    // Webhook (Apps Script)へ送信
    const resp = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet: 'daily_jst08', rows })
    })
    const text = await resp.text()

    return new Response(JSON.stringify({
      ok: true,
      count: rows.length,
      window: { from: windowStart, to: targetIso },
      webhook_status: resp.status,
      webhook_body: text.slice(0, 2000)
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status: 500 })
  }
})

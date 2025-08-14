'use client'

import React from 'react'
import { createClient } from '@/lib/supabaseClient'

type Row = {
  owner_id: string
  account_login: number
  broker: string | null
  tag: string | null
  currency: string | null
  balance: number | null
  equity: number | null
  profit_float: number | null
  margin: number | null
  ts_utc: string
  yday_balance: number | null
  delta_yday: number | null
  same_hour_yday_balance: number | null
  delta_same_hour_yday: number | null
}

export default function DashboardPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [ownerId, setOwnerId] = React.useState<string | null>(null)

  React.useEffect(() => {
    ;(async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id ?? null
      setOwnerId(uid)
      if (!uid) { setRows([]); setLoading(false); return }

      // ビューから取得：v_account_latest_with_deltas
      const { data, error } = await supabase
        .from('v_account_latest_with_deltas')
        .select('*')
        .eq('owner_id', uid)
        .order('account_login', { ascending: true })
        .limit(2000)

      if (error) {
        console.error(error)
        setRows([])
      } else {
        setRows((data ?? []) as Row[])
      }
      setLoading(false)
    })()
  }, [supabase])

  if (loading) return <div className="p-6">Loading…</div>
  if (!ownerId) return <div className="p-6">ログインしてください。</div>

  // 合計
  const totals = rows.reduce(
    (acc, r) => {
      acc.accounts++
      acc.balance += num(r.balance)
      acc.delta_yday += num(r.delta_yday)
      acc.delta_same_hour_yday += num(r.delta_same_hour_yday)
      return acc
    },
    { accounts: 0, balance: 0, delta_yday: 0, delta_same_hour_yday: 0 }
  )

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">口座ダッシュボード（残高／前日差／前日同時刻差）</h1>

      {/* 合計カード */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="表示口座数" value={totals.accounts.toLocaleString()} />
        <Card title="合計 残高" value={fmtMoney(totals.balance)} />
        <Card title="合計 前日差" value={fmtSigned(totals.delta_yday)} />
        <Card title="合計 前日同時刻差" value={fmtSigned(totals.delta_same_hour_yday)} />
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <Th className="w-28">口座</Th>
              <Th>ブローカー</Th>
              <Th>タグ</Th>
              <Th className="text-right w-32">残高</Th>
              <Th className="text-right w-32">有効証拠金</Th>
              <Th className="text-right w-28">前日差</Th>
              <Th className="text-right w-36">前日同時刻差</Th>
              <Th className="w-40">更新(UTC)</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.account_login} className={i % 2 ? 'bg-white' : 'bg-gray-50/50'}>
                <Td className="font-medium">{r.account_login}</Td>
                <Td>{r.broker ?? '-'}</Td>
                <Td>{r.tag ?? '-'}</Td>
                <Td className="text-right">{fmtMoney(r.balance)}</Td>
                <Td className="text-right">{fmtMoney(r.equity)}</Td>
                <Td className={`text-right ${numClass(r.delta_yday)}`}>{fmtSigned(r.delta_yday)}</Td>
                <Td className={`text-right ${numClass(r.delta_same_hour_yday)}`}>{fmtSigned(r.delta_same_hour_yday)}</Td>
                <Td>{fmtTime(r.ts_utc)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        ※ 前日差は「JST 08:00 締め」を基準に計算しています。<br/>
        ※ 前日同時刻差は「今の時刻の24時間前の値（±30分許容）」との差です。
      </p>
    </div>
  )
}

/* ------ UI小物 ------ */
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border p-4 shadow-sm bg-white">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}
function Th({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <th className={`px-3 py-2 text-left font-medium text-gray-700 ${className}`}>{children}</th>
}
function Td({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>
}

/* ------ 表示ユーティリティ ------ */
function num(v: number | null | undefined) {
  return v == null || isNaN(v as any) ? 0 : Number(v)
}
function fmtMoney(v: number | null | undefined) {
  if (v == null || isNaN(v as any)) return '-'
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtSigned(v: number | null | undefined) {
  if (v == null || isNaN(v as any)) return '-'
  const n = Number(v)
  const s = n >= 0 ? '+' : ''
  return s + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function numClass(v: number | null | undefined) {
  if (v == null || isNaN(v as any)) return ''
  return Number(v) >= 0 ? 'text-green-600' : 'text-red-600'
}
function fmtTime(isoOrTs: any) {
  try {
    const d = new Date(isoOrTs as string)
    return d.toISOString().replace('T', ' ').replace('Z', '')
  } catch { return String(isoOrTs) }
}

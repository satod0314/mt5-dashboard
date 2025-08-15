'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'

type Row = {
  owner_id: string
  account_login: string
  broker: string
  tag: string
  currency: string
  balance: number | string | null
  equity: number | string | null
  profit_float: number | string | null
  margin: number | string | null
  ts_utc: string
  yday_balance: number | string | null
  delta_yday: number | string | null
  same_hour_yday_balance: number | string | null
  delta_same_hour_yday: number | string | null
}

const asNum = (v: any) => (typeof v === 'number' ? v : v == null ? 0 : Number(v))
const fmtMoney = (v: any) => asNum(v).toLocaleString('ja-JP', { maximumFractionDigits: 0 })
const fmtJST = (utc: string) => new Date(utc).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

export default function DashboardPage() {
  // ✅ supabase クライアントを固定化（レンダーごとに再生成しない）
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [needLogin, setNeedLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string>('')

  // ✅ 二重実行防止ロック
  const busyRef = useRef(false)

  const load = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setLoading(true)
    setError(null)

    try {
      const { data: userData, error: uerr } = await supabase.auth.getUser()
      if (uerr) throw uerr
      const user = userData?.user

      if (!user) {
        setNeedLogin(true)
        setRows([])
        return
      }

      const { data, error } = await supabase
        .from('accounts_with_deltas')
        .select('*')
        .eq('owner_id', user.id)
        .order('balance', { ascending: false })

      if (error) throw error

      setRows((data || []) as Row[])
      setLastRefreshed(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    } catch (e: any) {
      console.error('load error:', e)
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
      busyRef.current = false
    }
  }, [supabase])

  // ✅ 初回だけロード（supabase が固定なので load も固定化され 1 回だけ実行）
  useEffect(() => {
    load()
  }, [load])

  if (needLogin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">ログインが必要です</h1>
        <p className="mb-4">このページはログインユーザーのデータのみ表示します。</p>
        <a className="inline-block px-4 py-2 rounded bg-black text-white" href="/login">
          ログインへ
        </a>
      </div>
    )
  }

  // 合計
  const totals = rows.reduce(
    (acc, r) => {
      acc.accounts += 1
      acc.balance += asNum(r.balance)
      acc.equity += asNum(r.equity)
      acc.profit += asNum(r.profit_float)
      acc.delta_yday += asNum(r.delta_yday)
      acc.delta_same_hour_yday += asNum(r.delta_same_hour_yday)
      return acc
    },
    { accounts: 0, balance: 0, equity: 0, profit: 0, delta_yday: 0, delta_same_hour_yday: 0 }
  )

  return (
    <div className="p-6">
      {/* ヘッダ + 更新ボタン */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">口座ダッシュボード</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">最終更新（JST）：{lastRefreshed || '-'}</span>
          <button
            onClick={load}
            disabled={loading}
            className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            aria-busy={loading}
          >
            {loading ? '更新中…' : '更新'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600">
          エラー: {error}{' '}
          <button className="underline ml-2" onClick={load}>
            再試行
          </button>
        </div>
      )}

      {/* 合計カード */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        <Card title="表示口座数" value={totals.accounts.toLocaleString()} />
        <Card title="合計 残高" value={fmtMoney(totals.balance)} />
        <Card title="合計 有効証拠金" value={fmtMoney(totals.equity)} />
        <Card title="合計 前日差 (JST08:00)" value={fmtMoney(totals.delta_yday)} />
        <Card title="合計 前日同時刻差" value={fmtMoney(totals.delta_same_hour_yday)} />
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">口座</th>
              <th className="px-3 py-2 text-left">ブローカー</th>
              <th className="px-3 py-2 text-left">タグ</th>
              <th className="px-3 py-2 text-right">残高</th>
              <th className="px-3 py-2 text-right">有効証拠金</th>
              <th className="px-3 py-2 text-right">含み損益</th>
              <th className="px-3 py-2 text-right">前日差 (JST08:00)</th>
              <th className="px-3 py-2 text-right">前日同時刻差</th>
              <th className="px-3 py-2 text-left">更新時刻（JST）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.owner_id}-${r.account_login}`} className="border-t">
                <td className="px-3 py-2">{r.account_login}</td>
                <td className="px-3 py-2">{r.broker}</td>
                <td className="px-3 py-2">{r.tag}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(r.balance)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(r.equity)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(r.profit_float)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(r.delta_yday)}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(r.delta_same_hour_yday)}</td>
                <td className="px-3 py-2">{fmtJST(r.ts_utc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  )
}

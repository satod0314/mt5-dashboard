// UPDATED: JST08:00 前日差 / JST表示 / 金額小数なし  (timestamp: $(date))
'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

type Row = {
  owner_id: string
  account_login: string
  broker: string
  tag: string
  currency: string
  balance: number
  equity: number
  profit_float: number
  margin: number
  ts_utc: string
  yday_balance: number | null
  delta_yday: number | null
  same_hour_yday_balance: number | null
  delta_same_hour_yday: number | null
}

type Totals = {
  accounts: number
  balance: number
  equity: number
  profit: number
  delta_yday: number
  delta_same_hour_yday: number
}

const fmtMoney = (v: number | null | undefined) =>
  v == null ? '-' : v.toLocaleString('ja-JP', { maximumFractionDigits: 0 })

const fmtJST = (utc: string) =>
  new Date(utc).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

export default function DashboardPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [totals, setTotals] = useState<Totals>({
    accounts: 0, balance: 0, equity: 0, profit: 0, delta_yday: 0, delta_same_hour_yday: 0
  })
  const [lastUpdatedJST, setLastUpdatedJST] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from('accounts_with_deltas')
        .select('*')
        .order('balance', { ascending: false })

      if (error) {
        console.error('[supabase] error:', error)
        return
      }
      const list = (data || []) as Row[]
      setRows(list)

      const t = list.reduce<Totals>((acc, r) => {
        acc.accounts += 1
        acc.balance += r.balance || 0
        acc.equity += r.equity || 0
        acc.profit += r.profit_float || 0
        acc.delta_yday += r.delta_yday || 0
        acc.delta_same_hour_yday += r.delta_same_hour_yday || 0
        return acc
      }, { accounts: 0, balance: 0, equity: 0, profit: 0, delta_yday: 0, delta_same_hour_yday: 0 })
      setTotals(t)

      setLastUpdatedJST(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    }
    run()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">口座ダッシュボード（JST08:00 前日差対応）</h1>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-4">
        <Card title="表示口座数" value={totals.accounts.toLocaleString()} />
        <Card title="合計 残高" value={fmtMoney(totals.balance)} />
        <Card title="合計 有効証拠金" value={fmtMoney(totals.equity)} />
        <Card title="合計 前日差 (JST08:00)" value={fmtMoney(totals.delta_yday)} />
        <Card title="合計 前日同時刻差" value={fmtMoney(totals.delta_same_hour_yday)} />
      </div>

      <p className="text-sm text-gray-500 mb-3">更新時刻（JST）: {lastUpdatedJST || '-'}</p>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2">口座</th>
              <th className="px-3 py-2">ブローカー</th>
              <th className="px-3 py-2">タグ</th>
              <th className="px-3 py-2 text-right">残高</th>
              <th className="px-3 py-2 text-right">有効証拠金</th>
              <th className="px-3 py-2 text-right">含み損益</th>
              <th className="px-3 py-2 text-right">前日差 (JST08:00)</th>
              <th className="px-3 py-2 text-right">前日同時刻差</th>
              <th className="px-3 py-2">更新時刻（JST）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account_login} className="border-t">
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

// deploy-touch: 2025-08-15T23:59:23+09:00

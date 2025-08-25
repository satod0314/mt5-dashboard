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
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [needLogin, setNeedLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [infoMsg, setInfoMsg] = useState<string>('')

  // 口座明細：全体一括開閉（デフォルト閉じ = 非表示）
  const [allOpen, setAllOpen] = useState(false)

  // 実行制御
  const busyRef = useRef(false)
  const didInit = useRef(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const load = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setLoading(true)
    setError(null)
    setInfoMsg('')

    try {
      const { data: userData, error: uerr } = await supabase.auth.getUser()
      if (uerr) throw uerr
      const user = userData?.user

      if (!user) {
        if (!alive.current) return
        setNeedLogin(true)
        setUserEmail('')
        setRows([])
        return
      }

      setUserEmail(user.email ?? '')

      const { data, error } = await supabase
        .from('accounts_with_deltas')
        .select('*')
        .eq('owner_id', user.id)
        .order('balance', { ascending: false })

      if (error) throw error

      if (!alive.current) return
      setRows((data || []) as Row[])
      setLastRefreshed(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    } catch (e: any) {
      console.error('load error:', e)
      if (!alive.current) return
      setError(e?.message || String(e))
    } finally {
      if (alive.current) setLoading(false)
      busyRef.current = false
    }
  }, [supabase])

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true
      setTimeout(() => { load() }, 0)
    }
  }, [load])

  const onSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setUserEmail('')
      setRows([])
      setNeedLogin(true)
    }
  }, [supabase])

  const onSendReset = useCallback(async () => {
    if (!userEmail) { setInfoMsg('メールアドレスが取得できません。いったんログアウトして再ログインしてください。'); return }
    setLoading(true)
    setError(null)
    setInfoMsg('')
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectTo = `${origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo })
      if (error) throw error
      setInfoMsg('パスワード変更用のメールを送信しました。受信箱をご確認ください。')
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [supabase, userEmail])

  if (needLogin) {
    return (
      <div className="p-6">
        {/* 見出しは本文と同じサイズ */}
        <h1 className="!text-base !font-normal mb-2" style={{fontSize:'1rem',fontWeight:400}}>ダッシュボード</h1>
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
      {/* 1行目：タイトル（本文サイズ） */}
      <h1 className="!text-base !font-normal" style={{fontSize:'1rem',fontWeight:400}}>ダッシュボード</h1>

      {/* 2行目：メール（ユーザー名） */}
      <div className="mt-1 text-sm text-gray-700">
        {userEmail || '-'}
      </div>

      {/* 3行目：最終更新（右：操作は表示/更新のみ） */}
      <div className="mt-1 mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">最終更新（JST）：{lastRefreshed || '-'}</div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setAllOpen(v => !v)}
            className={`px-3 h-9 rounded border text-sm hover:bg-gray-50 ${allOpen ? 'bg-gray-100' : ''}`}
            aria-pressed={allOpen}
            title="全口座の明細を表示/非表示"
          >
            口座詳細
          </button>
          <button
            onClick={load}
            disabled={loading || busyRef.current}
            className={`px-3 sm:px-4 h-9 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            aria-busy={loading}
          >
            {loading ? '更新中…' : '更新'}
          </button>
        </div>
      </div>

      {/* 合計カード */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card title="表示口座数" value={totals.accounts.toLocaleString()} />
        <Card title="合計 残高" value={fmtMoney(totals.balance)} />
        <Card title="合計 有効証拠金" value={fmtMoney(totals.equity)} />
        <Card title="合計 本日増減 (JST08:00)" value={fmtMoney(totals.delta_yday)} />
        <Card title="合計 前日同時刻差" value={fmtMoney(totals.delta_same_hour_yday)} />
      </div>

      {/* 口座一覧：デフォルトは非表示。allOpen のときだけ全件表示（交互背景） */}
      <div className="space-y-2">
        {!allOpen ? (
          <div className="text-sm text-gray-600">
            口座一覧は非表示です。「口座詳細」を押すと全口座の明細を表示します（{rows.length} 口座）。
          </div>
        ) : (
          rows.map((r, i) => {
            const key = `${r.owner_id}-${r.account_login}`
            const rowBg = i % 2 === 0 ? 'bg-gray-50' : 'bg-white' // ← 交互に薄い背景
            return (
              <div key={key} className={`border rounded-lg ${rowBg}`}>
                {/* コンパクトヘッダ */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="text-left">
                    <div className="text-sm font-medium">
                      {r.account_login}{' '}
                      <span className="text-gray-500 font-normal">/ {r.broker}{r.tag ? ` / ${r.tag}` : ''}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">通貨: {r.currency || '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-500">残高</div>
                    <div className="font-bold">{fmtMoney(r.balance)}</div>
                  </div>
                </div>

                {/* 明細 */}
                <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Info label="有効証拠金" value={fmtMoney(r.equity)} />
                  <Info label="含み損益" value={fmtMoney(r.profit_float)} />
                  <Info label="本日増減 (JST08:00)" value={fmtMoney(r.delta_yday)} />
                  <Info label="前日同時刻差" value={fmtMoney(r.delta_same_hour_yday)} />
                  <Info label="証拠金" value={fmtMoney(r.margin)} />
                  <Info label="更新（JST）" value={fmtJST(r.ts_utc)} />
                </div>
              </div>
            )
          })
        )}

        {allOpen && rows.length === 0 && (
          <div className="text-sm text-gray-600">データがありません。EAの送信と権限設定をご確認ください。</div>
        )}
      </div>

      {/* 最下部：アカウント操作（常時表示） */}
      <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
        <button
          onClick={onSendReset}
          className="px-3 h-10 rounded border text-sm hover:bg-gray-50"
          title="メールのリンクから新しいパスワードを設定します"
        >
          パスワード変更
        </button>
        <button
          onClick={onSignOut}
          className="px-3 h-10 rounded border text-sm hover:bg-gray-50"
          title="サインアウトします"
        >
          ログアウト
        </button>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

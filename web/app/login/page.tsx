'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')

  // 既にログイン済ならダッシュボードへ
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) router.replace('/dashboard')
    })()
  }, [supabase, router])

  // 「ログイン情報をブラウザに記憶する」：メールだけ保存
  useEffect(() => {
    const v = localStorage.getItem('remember_email')
    if (v) {
      setEmail(v)
      setRemember(true)
    }
  }, [])
  useEffect(() => {
    if (remember && email) localStorage.setItem('remember_email', email)
    else localStorage.removeItem('remember_email')
  }, [remember, email])

  const disabled = loading || !email || password.length < 6

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace('/dashboard')
    } catch (err: any) {
      setMsg(`エラー: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      // メール確認が有効なら確認メールの案内になる場合あり
      router.replace('/dashboard')
    } catch (err: any) {
      setMsg(`エラー: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = (e: React.MouseEvent) => {
    e.preventDefault()
    alert('パスワードリセットは未実装です（必要なら追加します）')
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8">ログイン</h1>

      <form onSubmit={handleLogin} className="space-y-5">
        {/* メールアドレス */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <label className="sm:col-span-3 text-sm font-semibold text-gray-700">
            メールアドレス
          </label>
          <div className="sm:col-span-9">
            <input
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              type="email"
              placeholder="メールアドレスを入力"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* パスワード */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <label className="sm:col-span-3 text-sm font-semibold text-gray-700">
            パスワード
          </label>
          <div className="sm:col-span-9">
            <input
              className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              type="password"
              placeholder="半角英数記号6〜14文字"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={6}
              required
            />
          </div>
        </div>

        {/* 記憶チェック */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-3" />
          <label className="sm:col-span-9 inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 border-gray-300 rounded"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            ログイン情報をブラウザに記憶する
          </label>
        </div>

        {/* ログインボタン */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-3" />
          <div className="sm:col-span-9">
            <button
              className={`w-full h-11 rounded text-white font-semibold transition ${
                disabled ? 'bg-blue-300' : 'bg-[#0ea5e9] hover:bg-[#0c94d1]'
              }`}
              disabled={disabled}
            >
              {loading ? '処理中…' : 'ログイン'}
            </button>
          </div>
        </div>

        {/* パスワード忘れ */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-3" />
          <div className="sm:col-span-9">
            <a
              href="#"
              onClick={handleForgot}
              className="text-sm text-sky-600 hover:underline"
            >
              パスワードを忘れた方はこちら
            </a>
          </div>
        </div>

        {/* メッセージ */}
        {msg && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-3" />
            <div className="sm:col-span-9">
              <div className="text-sm text-red-600">{msg}</div>
            </div>
          </div>
        )}

        {/* 会員登録ボタン（無料） */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-4">
          <div className="sm:col-span-3" />
          <div className="sm:col-span-9">
            <button
              type="button"
              onClick={handleSignup}
              className="w-full h-11 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold"
            >
              会員登録する（無料）
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

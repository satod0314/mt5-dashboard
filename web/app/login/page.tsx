'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 既にログイン済ならダッシュボードへ
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) router.replace('/dashboard')
    })()
  }, [supabase, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(mode === 'signin' ? 'サインイン中…' : 'アカウント作成中…')

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMsg('OK。ダッシュボードへ移動します…')
        router.replace('/dashboard')
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          setMsg('登録完了。必要に応じて確認メールをご確認ください。')
          router.replace('/dashboard')
        } else {
          setMsg('仮登録が完了しました。メールをご確認ください。')
        }
      }
    } catch (err: any) {
      setMsg(`エラー: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || !email || password.length < 6

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* ヘッダー（ロゴ/タイトル） */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md mb-3" />
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
            {mode === 'signin' ? 'ログイン' : '新規登録'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">MT5 ダッシュボードにアクセス</p>
        </div>

        {/* カード */}
        <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8">
          {/* タブ */}
          <div className="flex text-sm bg-slate-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg transition ${
                mode === 'signin' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setMode('signin'); setMsg('') }}
            >
              ログイン
            </button>
            <button
              type="button"
              className={`flex-1 py-2 rounded-lg transition ${
                mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => { setMode('signup'); setMsg('') }}
            >
              新規登録
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">メールアドレス</label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-1">パスワード</label>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'signin' ? 'パスワード' : '6文字以上で設定'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showPw ? 'パスワードを隠す' : 'パスワードを表示'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? (
                    // eye-off
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M10.58 10.59A2 2 0 0012 14a2 2 0 002-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M17.94 17.94C16.27 19 14.22 19.67 12 19.67 7 19.67 3.05 16.67 1 12c.66-1.43 1.6-2.7 2.75-3.76M14.12 5.12C13.45 5 12.74 4.92 12 4.92 7 4.92 3.05 7.92 1 12c.45.98 1.01 1.88 1.67 2.68" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    // eye
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              className={`w-full rounded-xl py-2 text-white font-medium transition ${
                disabled ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={disabled}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  処理中…
                </span>
              ) : mode === 'signin' ? 'ログイン' : '登録'}
            </button>
          </form>

          {/* メッセージ行 */}
          <div className="min-h-[1.5rem] mt-3 text-sm">
            {msg && (
              <div
                className={`px-3 py-2 rounded-lg ${
                  msg.startsWith('エラー') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {msg}
              </div>
            )}
          </div>

          {/* 補助リンク */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <a href="/dashboard" className="text-slate-600 hover:underline">
              ダッシュボードへ戻る
            </a>
            <a
              href="#"
              className="text-slate-500 hover:text-slate-700 hover:underline"
              onClick={(e) => {
                e.preventDefault()
                alert('パスワードリセットは未実装です（必要なら追加します）')
              }}
            >
              パスワードをお忘れですか？
            </a>
          </div>
        </div>

        {/* フッター */}
        <p className="text-center text-xs text-slate-500 mt-4">
          このサイトは認証済みユーザー専用です。
        </p>
      </div>
    </div>
  )
}

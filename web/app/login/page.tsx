'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg(mode === 'signin' ? 'サインイン中…' : 'アカウント作成中…')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMsg('OK。ダッシュボードへ移動します…')
        window.location.href = '/dashboard'
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // メール確認が有効な場合は確認メールが送信されます
        if (data.user?.identities && data.user.identities.length > 0) {
          setMsg('仮登録OK。メールの確認が必要な場合は受信箱をご確認ください。')
        } else {
          setMsg('登録完了。ダッシュボードへ移動します…')
        }
      }
    } catch (err: any) {
      setMsg(`エラー: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm border rounded-lg p-6 bg-white shadow-sm">
        <h1 className="text-xl font-semibold mb-4">
          {mode === 'signin' ? 'ログイン' : '新規登録'}
        </h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full border rounded p-2"
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="w-full border rounded p-2"
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          <button
            className={`w-full rounded p-2 text-white ${loading ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'}`}
            disabled={loading}
          >
            {loading ? '処理中…' : mode === 'signin' ? 'ログイン' : '登録'}
          </button>
        </form>

        <div className="text-sm text-gray-600 mt-3 min-h-[1.5rem]">{msg}</div>

        <div className="mt-4 text-sm">
          {mode === 'signin' ? (
            <button
              className="underline"
              onClick={() => { setMode('signup'); setMsg(''); }}
            >
              アカウントをお持ちでない方は新規登録
            </button>
          ) : (
            <button
              className="underline"
              onClick={() => { setMode('signin'); setMsg(''); }}
            >
              すでにアカウントをお持ちの方はログイン
            </button>
          )}
        </div>

        <div className="mt-6">
          <a href="/dashboard" className="text-sm underline text-gray-600">ダッシュボードへ戻る</a>
        </div>
      </div>
    </div>
  )
}

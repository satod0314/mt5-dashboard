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
    setMsg(mode === 'signin' ? 'サインイン中…' : '新規登録中…')

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        router.replace('/dashboard')
      }
    } catch (err: any) {
      setMsg(`エラー: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || !email || password.length < 6

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">
          {mode === 'signin' ? 'ログイン' : '新規登録'}
        </h1>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* メール（1行目） */}
          <input
            className="w-full border rounded p-2"
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {/* パスワード（2行目） */}
          <input
            className="w-full border rounded p-2"
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
          />

          {/* ボタン（下段） */}
          <button
            className={`w-full rounded p-2 text-white ${disabled ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'}`}
            disabled={disabled}
          >
            {loading ? '処理中…' : mode === 'signin' ? 'ログイン' : '新規登録'}
          </button>
        </form>

        {/* メッセージ */}
        <div className="text-sm text-gray-600 mt-3 min-h-[1.25rem]">{msg}</div>

        {/* 下にリンク（ログイン / 新規登録 の切替） */}
        <div className="mt-4 text-sm">
          {mode === 'signin' ? (
            <button className="underline" onClick={() => { setMode('signup'); setMsg('') }}>
              新規登録へ
            </button>
          ) : (
            <button className="underline" onClick={() => { setMode('signin'); setMsg('') }}>
              ログインへ
            </button>
          )}
        </div>

        {/* 任意：戻るリンク */}
        <div className="mt-4">
          <a href="/dashboard" className="text-sm underline text-gray-600">ダッシュボードへ戻る</a>
        </div>
      </div>
    </div>
  )
}

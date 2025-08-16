'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // リカバリーリンクで来たらセッションが張られる想定
  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.auth.getSession()
      setReady(Boolean(data?.session))
      if (!data?.session) {
        setMsg('無効なリンクか有効期限切れの可能性があります。再度お試しください。')
      }
    }
    f()
  }, [supabase])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw1.length < 6) { setMsg('パスワードは6文字以上で設定してください。'); return }
    if (pw1 !== pw2) { setMsg('確認用パスワードが一致しません。'); return }
    setLoading(true); setMsg('')
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 })
      if (error) throw error
      setMsg('パスワードを更新しました。ログイン画面へ移動します。')
      setTimeout(() => router.replace('/login'), 1200)
    } catch (err: any) {
      setMsg(`エラー: ${err?.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">パスワードの再設定</h1>
      <p className="text-sm text-gray-600 mb-4">
        受信メールのリンクから遷移すると、このページで新しいパスワードを設定できます。
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="新しいパスワード（6文字以上）"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          minLength={6}
          required
          disabled={!ready || loading}
        />
        <input
          className="w-full border rounded px-3 py-2"
          type="password"
          placeholder="新しいパスワード（確認用）"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          minLength={6}
          required
          disabled={!ready || loading}
        />
        <button
          className={`w-full h-11 rounded text-white font-semibold ${(!ready || loading) ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'}`}
          disabled={!ready || loading}
        >
          {loading ? '更新中…' : 'パスワードを変更する'}
        </button>
      </form>

      <div className="text-sm text-gray-700 mt-3 min-h-[1.25rem]">{msg}</div>

      <div className="mt-4">
        <a href="/login" className="text-sm underline text-gray-600">ログインへ戻る</a>
      </div>
    </div>
  )
}

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'

type Phase = 'checking' | 'need_link' | 'ready' | 'done'

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [phase, setPhase] = useState<Phase>('checking')
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  // 1) メールのリンクで来たとき、URLハッシュからトークンを取り出してセッションを確立
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (!hash) {
      setPhase('need_link')
      return
    }
    const params = new URLSearchParams(hash.substring(1)) // remove leading '#'
    const type = params.get('type')
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    // パスワード回復リンクで来た時だけ処理
    if (type !== 'recovery' || !access_token || !refresh_token) {
      setPhase('need_link')
      return
    }

    (async () => {
      try {
        setError(null)
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
        if (setErr) throw setErr
        setPhase('ready')
      } catch (e: any) {
        setError(e?.message || String(e))
        setPhase('need_link')
      }
    })()
  }, [supabase])

  // 2) パスワード更新
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)

    // 超初心者向けのやさしいバリデーション
    if (!password || password.length < 8) {
      setError('パスワードは8文字以上で入力してください。')
      return
    }
    if (password !== confirm) {
      setError('確認用パスワードが一致しません。')
      return
    }

    setBusy(true)
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password })
      if (upErr) throw upErr
      setPhase('done')

      // 数秒後にダッシュボードへ
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  // UI（本文サイズの見出し）
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-xl p-5 bg-white shadow-sm">
        <h1 className="text-base font-normal mb-2">パスワード変更</h1>

        {phase === 'checking' && (
          <p className="text-sm text-gray-600">確認中です…</p>
        )}

        {phase === 'need_link' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              パスワード変更用のリンクからアクセスしてください。<br />
              ダッシュボードの「パスワード変更」ボタンを押すと、メールが届きます。
            </p>
            <a href="/dashboard" className="inline-block px-3 h-9 leading-9 rounded border text-sm hover:bg-gray-50">
              ダッシュボードに戻る
            </a>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">新しいパスワード</label>
              <input
                type="password"
                className="w-full border rounded px-3 h-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">新しいパスワード（確認）</label>
              <input
                type="password"
                className="w-full border rounded px-3 h-10"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="もう一度入力"
                minLength={8}
                required
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={busy}
              className={`w-full h-10 rounded text-white ${busy ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {busy ? '更新中…' : 'パスワードを更新する'}
            </button>
          </form>
        )}

        {phase === 'done' && (
          <div className="space-y-3">
            <p className="text-sm text-green-700">パスワードを更新しました。ダッシュボードへ移動します…</p>
            <a href="/dashboard" className="inline-block px-3 h-9 leading-9 rounded border text-sm hover:bg-gray-50">
              すぐに移動する
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

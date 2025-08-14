
'use client';
import { useState } from 'react';
import { createClient } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Page() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const signUp = async () => {
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? error.message : 'メールを確認して登録を完了してください。');
    setLoading(false);
  };
  const signIn = async () => {
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message); else router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div style={{maxWidth:420, margin:'0 auto'}}>
      <h1>MT5 口座モニター</h1>
      <p>メールとパスワードでサインアップ後、ログインしてください。</p>
      <input placeholder="メール" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%', padding:8, marginBottom:8}}/>
      <input placeholder="パスワード" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%', padding:8, marginBottom:8}}/>
      <div style={{display:'flex', gap:8}}>
        <button onClick={signUp} disabled={loading}>サインアップ</button>
        <button onClick={signIn} disabled={loading}>ログイン</button>
      </div>
      {msg && <p>{msg}</p>}
    </div>
  );
}

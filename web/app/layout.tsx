
export const metadata = { title: 'MT5 Monitor', description: 'リアルタイム口座モニター' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ja"><body style={{fontFamily:'system-ui, sans-serif', padding: 16}}>{children}</body></html>);
}

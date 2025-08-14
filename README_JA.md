
# MT5 → Supabase → Web（Next.js）→ スプレッドシート（毎時） スターターパック（TimescaleDBなし版）

このセットは **TimescaleDB 拡張を使わない** 前提で動く完全版です。
- MT5 EA（イベント駆動＋しきい値＋心拍）→ Supabase Edge Function `/ingest` → Postgres保存
- Web（Next.js）でログイン後に**リアルタイム表示**（Supabase Realtime）
- 毎時 `rollup` 関数で 1時間足に集計＋**48時間より古い高頻度データを削除**（DB軽量化）
- 任意で Google スプレッドシートに毎時結果を Append

## セットアップ要約
1) Supabase プロジェクト作成 → `supabase/sql/schema.sql` を SQL Editor で実行（**TimescaleDB前提の記述は一切なし**）  
2) Supabase CLI：`supabase login` → `supabase link`（このプロジェクトへ）  
3) Secrets 設定：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`INGEST_API_KEY`、（任意）`SHEETS_WEBHOOK_URL`  
4) デプロイ：`supabase functions deploy ingest` / `rollup`  
5) Functions → **rollup** → 「Schedule」で毎時実行ON（これが 1h 集計＋48h超データ削除を実施）  
6) Web：`web` フォルダで `.env.local` を設定 → `npm i` → `npm run dev`（Vercelで本番公開も可）  
7) MT5：EAの `API_URL`（ingest URL）、`API_KEY`、`OWNER_ID` を設定 → WebRequest許可URLに追加して EA セット

詳しい公開手順は、チャットで共有した「最初から本番公開までの手順」を参照してください。

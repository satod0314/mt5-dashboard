
create extension if not exists "uuid-ossp";

-- 高頻度（snapshots_hi）：48h保持は rollup 関数で削除運用
create table if not exists public.snapshots_hi (
  ts_utc        timestamptz not null,
  owner_id      uuid not null,
  account_login bigint not null,
  broker        text,
  tag           text,
  currency      text,
  balance       double precision,
  equity        double precision,
  profit_float  double precision,
  margin        double precision,
  reason        text,
  primary key (account_login, ts_utc)
);
create index if not exists snapshots_hi_owner_account_ts_idx on public.snapshots_hi (owner_id, account_login, ts_utc desc);

-- 1時間足（長期）
create table if not exists public.snapshots_hr (
  hour_utc      timestamptz not null,
  owner_id      uuid not null,
  account_login bigint not null,
  equity_last   double precision,
  balance_last  double precision,
  profit_last   double precision,
  primary key (account_login, hour_utc)
);
create index if not exists snapshots_hr_owner_hour_idx on public.snapshots_hr (owner_id, hour_utc desc);

-- RLS（本人のみ参照）
alter table public.snapshots_hi enable row level security;
alter table public.snapshots_hr enable row level security;
drop policy if exists "read-own-hi" on public.snapshots_hi;
create policy "read-own-hi" on public.snapshots_hi for select using ( auth.uid() = owner_id );
drop policy if exists "read-own-hr" on public.snapshots_hr;
create policy "read-own-hr" on public.snapshots_hr for select using ( auth.uid() = owner_id );

-- 最新＋前日同時刻差
create or replace function public.get_latest_with_yday_diff()
returns table (
  account_login bigint,
  ts_now timestamptz,
  equity_now double precision,
  equity_y double precision,
  diff_same_time_yday double precision
)
language sql
security invoker
stable
as $$
with latest as (
  select distinct on (account_login)
    account_login, owner_id, ts_utc, equity
  from public.snapshots_hi
  where owner_id = auth.uid()
  order by account_login, ts_utc desc
),
y_same as (
  select l.account_login, h.equity as equity_y, h.ts_utc as ts_y
  from latest l
  join lateral (
    select equity, ts_utc
    from public.snapshots_hi
    where owner_id = l.owner_id
      and account_login = l.account_login
      and ts_utc <= (now() at time zone 'utc') - interval '24 hours'
    order by ts_utc desc
    limit 1
  ) h on true
)
select l.account_login, l.ts_utc as ts_now, l.equity as equity_now,
       y.equity_y,
       coalesce(l.equity - y.equity_y, 0) as diff_same_time_yday
from latest l
left join y_same y on y.account_login = l.account_login
order by l.account_login;
$$;

-- rollupで使う：指定時間帯の末尾の値を取得
create or replace function public.rollup_last_points(p_start timestamptz, p_end timestamptz)
returns table (
  owner_id uuid,
  account_login bigint,
  ts_utc timestamptz,
  balance double precision,
  equity double precision,
  profit_float double precision
)
language sql
security invoker
stable
as $$
  with cand as (
    select owner_id, account_login, ts_utc, balance, equity, profit_float
    from public.snapshots_hi
    where ts_utc >= p_start and ts_utc <= p_end
  ),
  last_per_account as (
    select distinct on (owner_id, account_login)
      owner_id, account_login, ts_utc, balance, equity, profit_float
    from cand
    order by owner_id, account_login, ts_utc desc
  )
  select * from last_per_account;
$$;

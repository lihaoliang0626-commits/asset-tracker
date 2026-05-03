create table if not exists public.snapshots (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  timestamp bigint not null,
  base_currency text not null,
  total_asset double precision not null,
  assets jsonb not null default '[]'::jsonb,
  note text,
  ai_insight text,
  schema_version text not null default '1.0.0',
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists snapshots_user_time_idx on public.snapshots(user_id, timestamp desc);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  base_currency text not null default 'CNY',
  exchange_rate_mode text not null default 'auto',
  theme text not null default 'light',
  language text not null default 'zh-CN',
  enable_ai_analysis boolean not null default false,
  data_backup_enabled boolean not null default false,
  last_backup_date bigint,
  enabled_asset_types jsonb not null default '["cash","bank","securities","crypto","payment"]'::jsonb,
  advanced_categories jsonb not null default '[]'::jsonb,
  allocation_target jsonb,
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists public.goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount double precision not null,
  base_currency text not null,
  deadline bigint not null,
  start_amount double precision not null,
  start_time bigint not null,
  description text,
  is_active boolean not null default true,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists goals_user_active_idx on public.goals(user_id, is_active);

create table if not exists public.exchange_rates (
  id text primary key,
  from_currency text not null,
  to_currency text not null,
  rate double precision not null,
  timestamp bigint not null,
  source text not null
);

create index if not exists exchange_rates_pair_time_idx on public.exchange_rates(from_currency, to_currency, timestamp desc);

alter table public.snapshots enable row level security;
alter table public.settings enable row level security;
alter table public.goals enable row level security;

drop policy if exists "Users manage own snapshots" on public.snapshots;
create policy "Users manage own snapshots"
on public.snapshots
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own settings" on public.settings;
create policy "Users manage own settings"
on public.settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals"
on public.goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.exchange_rates enable row level security;

drop policy if exists "Authenticated users read exchange rates" on public.exchange_rates;
create policy "Authenticated users read exchange rates"
on public.exchange_rates
for select
to authenticated
using (true);

drop policy if exists "Authenticated users write exchange rates" on public.exchange_rates;
create policy "Authenticated users write exchange rates"
on public.exchange_rates
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users delete old exchange rates" on public.exchange_rates;
create policy "Authenticated users delete old exchange rates"
on public.exchange_rates
for delete
to authenticated
using (true);

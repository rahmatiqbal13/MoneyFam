-- ============================================================
-- MIGRATION: Investments & Pension Settings
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ============================================================
-- INVESTMENTS
-- ============================================================
create table if not exists investments (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('saham', 'reksadana', 'emas', 'kripto', 'deposito', 'obligasi')),
  code text,
  name text not null,
  quantity numeric(18,8) not null default 0,
  buy_price numeric(18,2) not null default 0,
  current_price numeric(18,2) default 0,
  buy_date date,
  wallet_id uuid references wallets(id) on delete set null,
  notes text,
  interest_rate numeric(5,2) default 0,
  maturity_date date,
  price_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table investments enable row level security;

drop policy if exists "investments_select" on investments;
create policy "investments_select" on investments
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "investments_insert" on investments;
create policy "investments_insert" on investments
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "investments_update" on investments;
create policy "investments_update" on investments
  for update using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "investments_delete" on investments;
create policy "investments_delete" on investments
  for delete using (user_id = auth.uid() or family_id = get_user_family_id());

create index if not exists idx_investments_family on investments(family_id);

-- Add user_id column to existing investments table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_name = 'investments' and column_name = 'user_id') then
    alter table investments add column user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists idx_investments_user on investments(user_id);

-- ============================================================
-- PENSION SETTINGS
-- ============================================================
create table if not exists pension_settings (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  monthly_salary numeric(18,2) default 0,
  current_age integer default 30,
  target_age integer default 60,
  existing_fund numeric(18,2) default 0,
  inflation_rate numeric(5,2) default 5,
  return_rate numeric(5,2) default 8,
  life_expectancy integer default 80,
  monthly_expense_pct numeric(5,2) default 70,
  bpjs_balance numeric(18,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- Add user_id column to existing pension_settings table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_name = 'pension_settings' and column_name = 'user_id') then
    alter table pension_settings add column user_id uuid references auth.users(id) on delete cascade;
  end if;
end $$;

alter table pension_settings enable row level security;

drop policy if exists "pension_settings_select" on pension_settings;
create policy "pension_settings_select" on pension_settings
  for select using (user_id = auth.uid());

drop policy if exists "pension_settings_insert" on pension_settings;
create policy "pension_settings_insert" on pension_settings
  for insert with check (user_id = auth.uid());

drop policy if exists "pension_settings_update" on pension_settings;
create policy "pension_settings_update" on pension_settings
  for update using (user_id = auth.uid());

drop policy if exists "pension_settings_delete" on pension_settings;
create policy "pension_settings_delete" on pension_settings
  for delete using (user_id = auth.uid());

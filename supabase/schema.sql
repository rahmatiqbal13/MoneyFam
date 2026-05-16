-- ============================================================
-- MoneyFam Database Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- FAMILIES
-- ============================================================
create table if not exists families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code varchar(8) unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RPC: cari family berdasarkan invite code (bypass RLS)
create or replace function get_family_by_invite_code(p_code text)
returns setof families as $$
  select * from families where invite_code = upper(trim(p_code)) limit 1
$$ language sql stable security definer;

-- RPC: keluarkan anggota dari keluarga (hanya owner, bypass RLS profiles_update)
create or replace function remove_family_member(member_id uuid)
returns void as $$
declare
  v_caller_family_id uuid;
  v_caller_role text;
  v_member_family_id uuid;
begin
  select family_id, role into v_caller_family_id, v_caller_role
  from profiles where id = auth.uid();

  if v_caller_role != 'owner' then
    raise exception 'Hanya pemilik keluarga yang bisa mengeluarkan anggota';
  end if;

  select family_id into v_member_family_id from profiles where id = member_id;
  if v_member_family_id is distinct from v_caller_family_id then
    raise exception 'Anggota tidak terdaftar di keluarga Anda';
  end if;

  if member_id = auth.uid() then
    raise exception 'Tidak bisa mengeluarkan diri sendiri';
  end if;

  update profiles set family_id = null where id = member_id;
end;
$$ language plpgsql security definer;

-- RPC: buat keluarga baru (bypass RLS)
create or replace function create_family(p_name text, p_user_id uuid)
returns uuid as $$
declare
  v_family_id uuid;
  v_profile_exists boolean;
begin
  -- Generate UUID untuk family
  v_family_id := gen_random_uuid();
  
  -- Insert family
  insert into families (id, name) values (v_family_id, p_name);
  
  -- Cek apakah profile sudah ada
  select exists(select 1 from profiles where id = p_user_id) into v_profile_exists;
  
  if v_profile_exists then
    -- Update existing profile
    update profiles 
    set family_id = v_family_id, role = 'owner' 
    where id = p_user_id;
  else
    -- Insert new profile
    insert into profiles (id, family_id, role, full_name)
    values (p_user_id, v_family_id, 'owner', split_part(auth.email(), '@', 1));
  end if;
  
  return v_family_id;
end;
$$ language plpgsql security definer;

-- RPC: Seed kategori default untuk keluarga baru
-- Menyalin semua kategori default (family_id is null) ke keluarga tertentu
-- Skip kategori yang sudah ada (berdasarkan nama) untuk menghindari duplikat
-- Skip kategori default yang sudah di-hidden oleh keluarga

create or replace function seed_default_categories(p_family_id uuid)
returns void as $$
declare
  v_category record;
  v_exists boolean;
begin
  -- Insert kategori default yang belum ada di keluarga ini dan belum di-hidden
  for v_category in 
    select DISTINCT ON (name) * from categories 
    where family_id is null 
    and is_default = true
    and id not in (
      select category_id from hidden_default_categories 
      where family_id = p_family_id
    )
    order by name, created_at  -- Ambil yang paling awal dibuat
  loop
    -- Cek apakah kategori dengan nama yang sama sudah ada di keluarga ini
    select exists(
      select 1 from categories 
      where family_id = p_family_id 
      and lower(name) = lower(v_category.name)
    ) into v_exists;
    
    -- Insert hanya jika belum ada
    if not v_exists then
      insert into categories (family_id, name, type, icon, color, is_default)
      values (p_family_id, v_category.name, v_category.type, v_category.icon, v_category.color, false);
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Function untuk cleanup kategori duplikat (jalankan jika ada duplikat)
create or replace function cleanup_duplicate_categories()
returns void as $$
begin
  -- Hapus kategori duplikat berdasarkan nama untuk family_id null (default categories)
  -- Simpan hanya yang created_at paling awal
  delete from categories
  where id in (
    select c1.id
    from categories c1
    inner join categories c2 on lower(c1.name) = lower(c2.name) 
      and c1.family_id is null 
      and c2.family_id is null
      and c1.is_default = true 
      and c2.is_default = true
    where c1.created_at > c2.created_at
      and c1.id != c2.id
  );
  
  -- Hapus kategori duplikat untuk user/family tertentu
  -- Simpan hanya yang created_at paling awal
  delete from categories
  where id in (
    select c1.id
    from categories c1
    inner join categories c2 on lower(c1.name) = lower(c2.name) 
      and c1.family_id = c2.family_id
    where c1.created_at > c2.created_at
      and c1.id != c2.id
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid references families(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  role text default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text default '📦',
  color text default '#6b7280',
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Add user_id column to existing categories table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'categories' and column_name = 'user_id') then
    alter table categories add column user_id uuid references auth.users(id) on delete cascade;
  end if;
end $$;

-- ============================================================
-- HIDDEN DEFAULT CATEGORIES (untuk tracking kategori default yang dihapus per keluarga)
-- ============================================================
create table if not exists hidden_default_categories (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (family_id, category_id)
);

-- RLS untuk hidden_default_categories
alter table hidden_default_categories enable row level security;

drop policy if exists "hidden_categories_select" on hidden_default_categories;
create policy "hidden_categories_select" on hidden_default_categories
  for select using (family_id = get_user_family_id());

drop policy if exists "hidden_categories_insert" on hidden_default_categories;
create policy "hidden_categories_insert" on hidden_default_categories
  for insert with check (family_id = get_user_family_id());

drop policy if exists "hidden_categories_delete" on hidden_default_categories;
create policy "hidden_categories_delete" on hidden_default_categories
  for delete using (family_id = get_user_family_id());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('budget_warning', 'monthly_report', 'transaction_alert', 'reminder_daily', 'goal_achieved', 'debt_due')),
  title text not null,
  message text not null,
  data jsonb default null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- RLS untuk notifications
alter table notifications enable row level security;

drop policy if exists "notifications_select" on notifications;
create policy "notifications_select" on notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert" on notifications
  for insert with check (family_id = get_user_family_id());

drop policy if exists "notifications_update" on notifications;
create policy "notifications_update" on notifications
  for update using (user_id = auth.uid());

drop policy if exists "notifications_delete" on notifications;
create policy "notifications_delete" on notifications
  for delete using (user_id = auth.uid());

-- ============================================================
-- NOTIFICATION SETTINGS
-- ============================================================
create table if not exists notification_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  budget_warning boolean default true,
  monthly_report boolean default true,
  transaction_alert boolean default false,
  reminder_daily boolean default false,
  goal_achieved boolean default true,
  debt_due boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- RLS untuk notification_settings
alter table notification_settings enable row level security;

drop policy if exists "notification_settings_select" on notification_settings;
create policy "notification_settings_select" on notification_settings
  for select using (user_id = auth.uid());

drop policy if exists "notification_settings_insert" on notification_settings;
create policy "notification_settings_insert" on notification_settings
  for insert with check (user_id = auth.uid());

drop policy if exists "notification_settings_update" on notification_settings;
create policy "notification_settings_update" on notification_settings
  for update using (user_id = auth.uid());

-- ============================================================
-- WALLETS (Kantong)
-- ============================================================
create table if not exists wallets (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  type text default 'cash' check (type in ('cash', 'bank', 'ewallet', 'savings', 'investment', 'credit', 'other')),
  icon text default '💳',
  color text default '#10b981',
  balance numeric(18,2) default 0,
  initial_balance numeric(18,2) default 0,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add user_id column to existing wallets table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_name = 'wallets' and column_name = 'user_id') then
    alter table wallets add column user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  wallet_id uuid references wallets(id) on delete set null,
  to_wallet_id uuid references wallets(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(18,2) not null check (amount > 0),
  date date not null default current_date,
  description text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add user_id column to existing transactions table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_name = 'transactions' and column_name = 'user_id') then
    alter table transactions add column user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- TRANSFERS (detailed transfer log)
-- ============================================================
create table if not exists transfers (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  from_wallet_id uuid references wallets(id) on delete set null,
  to_wallet_id uuid references wallets(id) on delete set null,
  amount numeric(18,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz default now()
);

-- Add user_id column to existing transfers table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_name = 'transfers' and column_name = 'user_id') then
    alter table transfers add column user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- BUDGETS
-- ============================================================
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade not null,
  amount numeric(18,2) not null check (amount > 0),
  year integer not null,
  month integer not null check (month between 1 and 12),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (family_id, category_id, year, month)
);

-- ============================================================
-- SAVINGS GOALS
-- ============================================================
create table if not exists savings_goals (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  target_amount numeric(18,2) not null,
  current_amount numeric(18,2) default 0,
  target_date date,
  icon text default '🎯',
  color text default '#10b981',
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add user_id column to existing savings_goals table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_name = 'savings_goals' and column_name = 'user_id') then
    alter table savings_goals add column user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- DEBTS
-- ============================================================
create table if not exists debts (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  type text default 'debt' check (type in ('debt', 'receivable')),
  amount numeric(18,2) not null,
  remaining_amount numeric(18,2) not null,
  due_date date,
  description text,
  is_paid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add user_id column to existing debts table (for migration)
do $$
begin
  if not exists (select 1 from information_schema.columns 
    where table_name = 'debts' and column_name = 'user_id') then
    alter table debts add column user_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- TRIGGERS: Update wallet balance on transaction
-- ============================================================

-- Function to update wallet balance
create or replace function update_wallet_balance_on_insert()
returns trigger as $$
begin
  if NEW.type = 'income' then
    update wallets set balance = balance + NEW.amount where id = NEW.wallet_id;
  elsif NEW.type = 'expense' then
    update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
  elsif NEW.type = 'transfer' then
    update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
    if NEW.to_wallet_id is not null then
      update wallets set balance = balance + NEW.amount where id = NEW.to_wallet_id;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create or replace function update_wallet_balance_on_delete()
returns trigger as $$
begin
  if OLD.type = 'income' then
    update wallets set balance = balance - OLD.amount where id = OLD.wallet_id;
  elsif OLD.type = 'expense' then
    update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
  elsif OLD.type = 'transfer' then
    update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
    if OLD.to_wallet_id is not null then
      update wallets set balance = balance - OLD.amount where id = OLD.to_wallet_id;
    end if;
  end if;
  return OLD;
end;
$$ language plpgsql;

create or replace function update_wallet_balance_on_update()
returns trigger as $$
begin
  -- Reverse old effect
  if OLD.type = 'income' then
    update wallets set balance = balance - OLD.amount where id = OLD.wallet_id;
  elsif OLD.type = 'expense' then
    update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
  elsif OLD.type = 'transfer' then
    update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
    if OLD.to_wallet_id is not null then
      update wallets set balance = balance - OLD.amount where id = OLD.to_wallet_id;
    end if;
  end if;

  -- Apply new effect
  if NEW.type = 'income' then
    update wallets set balance = balance + NEW.amount where id = NEW.wallet_id;
  elsif NEW.type = 'expense' then
    update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
  elsif NEW.type = 'transfer' then
    update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
    if NEW.to_wallet_id is not null then
      update wallets set balance = balance + NEW.amount where id = NEW.to_wallet_id;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql;

-- Drop existing triggers if they exist
drop trigger if exists trg_wallet_balance_insert on transactions;
drop trigger if exists trg_wallet_balance_delete on transactions;
drop trigger if exists trg_wallet_balance_update on transactions;

-- Create triggers
create trigger trg_wallet_balance_insert
  after insert on transactions
  for each row execute function update_wallet_balance_on_insert();

create trigger trg_wallet_balance_delete
  after delete on transactions
  for each row execute function update_wallet_balance_on_delete();

create trigger trg_wallet_balance_update
  after update on transactions
  for each row execute function update_wallet_balance_on_update();

-- ============================================================
-- RPC Functions for manual wallet balance adjustment
-- ============================================================
create or replace function increment_wallet_balance(wallet_id uuid, amount numeric)
returns void as $$
begin
  update wallets set balance = balance + amount where id = wallet_id;
end;
$$ language plpgsql security definer;

create or replace function decrement_wallet_balance(wallet_id uuid, amount numeric)
returns void as $$
begin
  update wallets set balance = balance - amount where id = wallet_id;
end;
$$ language plpgsql security definer;

-- Delete all transactions for a family and reset wallet balances to initial_balance.
-- Runs server-side to avoid N×round-trips from per-row delete triggers.
create or replace function delete_all_family_transactions(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify caller is a member of this family
  if not exists (
    select 1 from profiles
    where id = auth.uid()
    and family_id = p_family_id
  ) then
    raise exception 'Not authorized';
  end if;

  -- Triggers will fire per-row but the final reset below is the source of truth
  delete from transactions where family_id = p_family_id;

  -- Reset all wallets to their initial_balance in one statement
  update wallets
  set balance = initial_balance
  where family_id = p_family_id;
end;
$$;

-- Same for solo users (no family)
create or replace function delete_all_user_transactions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  delete from transactions where user_id = p_user_id and family_id is null;

  update wallets
  set balance = initial_balance
  where user_id = p_user_id and family_id is null;
end;
$$;

-- ============================================================
-- RPC: Atomic operations for savings goals and debts
-- ============================================================

-- Add to savings goal atomically (BUG-004 fix)
create or replace function add_to_savings_goal_atomic(
  p_goal_id uuid,
  p_amount numeric,
  p_wallet_id uuid,
  p_category_id uuid,
  p_goal_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_amount numeric;
  v_target_amount numeric;
  v_family_id uuid;
  v_user_id uuid;
begin
  -- Get current values and verify ownership
  select current_amount, target_amount, family_id, user_id
  into v_current_amount, v_target_amount, v_family_id, v_user_id
  from savings_goals
  where id = p_goal_id;
  
  if v_user_id is null then
    raise exception 'Goal not found';
  end if;
  
  -- Verify caller is the owner
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  
  -- Update goal amount
  update savings_goals
  set current_amount = current_amount + p_amount,
      is_completed = (current_amount + p_amount >= target_amount),
      updated_at = now()
  where id = p_goal_id;
  
  -- Create transaction record
  insert into transactions (
    family_id,
    user_id,
    wallet_id,
    category_id,
    type,
    amount,
    date,
    description
  ) values (
    v_family_id,
    v_user_id,
    p_wallet_id,
    p_category_id,
    case when p_amount > 0 then 'expense' else 'income' end,
    abs(p_amount),
    current_date,
    case when p_amount > 0 then 'Menabung: ' || p_goal_name else 'Tarik tabungan: ' || p_goal_name end
  );
end;
$$;

-- Mark debt as paid atomically (BUG-005 fix)
create or replace function mark_debt_paid_atomic(
  p_debt_id uuid,
  p_wallet_id uuid,
  p_category_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id uuid;
  v_debt_name text;
  v_remaining numeric;
begin
  -- Get debt info and verify ownership
  select family_id, user_id, name, remaining_amount
  into v_family_id, v_user_id, v_debt_name, v_remaining
  from debts
  where id = p_debt_id;
  
  if v_user_id is null then
    raise exception 'Debt not found';
  end if;
  
  -- Verify caller is the owner
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  
  -- Update debt
  update debts
  set is_paid = true,
      remaining_amount = 0,
      updated_at = now()
  where id = p_debt_id;
  
  -- Create transaction record
  insert into transactions (
    family_id,
    user_id,
    wallet_id,
    category_id,
    type,
    amount,
    date,
    description
  ) values (
    v_family_id,
    v_user_id,
    p_wallet_id,
    p_category_id,
    'expense',
    p_amount,
    current_date,
    'Pelunasan hutang: ' || v_debt_name
  );
end;
$$;

-- Pay debt partially atomically (BUG-005 fix)
create or replace function pay_debt_atomic(
  p_debt_id uuid,
  p_payment_amount numeric,
  p_wallet_id uuid,
  p_category_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id uuid;
  v_debt_name text;
  v_remaining numeric;
  v_new_remaining numeric;
begin
  -- Get debt info and verify ownership
  select family_id, user_id, name, remaining_amount
  into v_family_id, v_user_id, v_debt_name, v_remaining
  from debts
  where id = p_debt_id;
  
  if v_user_id is null then
    raise exception 'Debt not found';
  end if;
  
  -- Verify caller is the owner
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  
  -- Calculate new remaining
  v_new_remaining := v_remaining - p_payment_amount;
  
  -- Update debt
  update debts
  set remaining_amount = v_new_remaining,
      is_paid = (v_new_remaining <= 0),
      updated_at = now()
  where id = p_debt_id;
  
  -- Create transaction record
  insert into transactions (
    family_id,
    user_id,
    wallet_id,
    category_id,
    type,
    amount,
    date,
    description
  ) values (
    v_family_id,
    v_user_id,
    p_wallet_id,
    p_category_id,
    'expense',
    p_payment_amount,
    current_date,
    'Bayar hutang: ' || v_debt_name
  );
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table families enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table transfers enable row level security;
alter table budgets enable row level security;
alter table savings_goals enable row level security;
alter table debts enable row level security;

-- Helper function to get user's family_id
create or replace function get_user_family_id()
returns uuid as $$
  select family_id from profiles where id = auth.uid()
$$ language sql stable security definer;

-- FAMILIES: members of the same family OR owner can see their own created families (before profile update)
drop policy if exists "families_select" on families;
create policy "families_select" on families
  for select using (
    id = get_user_family_id() 
    OR 
    id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
  );

drop policy if exists "families_insert" on families;
create policy "families_insert" on families
  for insert with check (true);

drop policy if exists "families_update" on families;
create policy "families_update" on families
  for update using (id = get_user_family_id());

-- PROFILES: own or same family
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (family_id = get_user_family_id() or id = auth.uid());

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update using (id = auth.uid());

-- CATEGORIES: own family + defaults (family_id is null) + solo user (user_id)
drop policy if exists "categories_select" on categories;
create policy "categories_select" on categories
  for select using (
    family_id is null  -- default categories
    or family_id = get_user_family_id()  -- family categories
    or user_id = auth.uid()  -- solo user categories
  );

drop policy if exists "categories_insert" on categories;
create policy "categories_insert" on categories
  for insert with check (
    family_id = get_user_family_id()  -- family user
    or user_id = auth.uid()  -- solo user
  );

drop policy if exists "categories_update" on categories;
create policy "categories_update" on categories
  for update using (
    family_id = get_user_family_id()  -- family categories
    or user_id = auth.uid()  -- solo user categories
  );

drop policy if exists "categories_delete" on categories;
create policy "categories_delete" on categories
  for delete using (
    family_id = get_user_family_id()  -- family categories
    or user_id = auth.uid()  -- solo user categories
  );

-- WALLETS: personal (user_id) or family
drop policy if exists "wallets_select" on wallets;
create policy "wallets_select" on wallets
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "wallets_insert" on wallets;
create policy "wallets_insert" on wallets
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "wallets_update" on wallets;
create policy "wallets_update" on wallets
  for update using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "wallets_delete" on wallets;
create policy "wallets_delete" on wallets
  for delete using (user_id = auth.uid() or family_id = get_user_family_id());

-- TRANSACTIONS: personal (user_id) or family
drop policy if exists "transactions_select" on transactions;
create policy "transactions_select" on transactions
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "transactions_insert" on transactions;
create policy "transactions_insert" on transactions
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "transactions_update" on transactions;
create policy "transactions_update" on transactions
  for update using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "transactions_delete" on transactions;
create policy "transactions_delete" on transactions
  for delete using (user_id = auth.uid() or family_id = get_user_family_id());

-- TRANSFERS: personal (user_id) or family
drop policy if exists "transfers_select" on transfers;
create policy "transfers_select" on transfers
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "transfers_insert" on transfers;
create policy "transfers_insert" on transfers
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

-- BUDGETS: personal (user_id) or family
drop policy if exists "budgets_select" on budgets;
create policy "budgets_select" on budgets
  for select using (family_id is null or family_id = get_user_family_id());

drop policy if exists "budgets_insert" on budgets;
create policy "budgets_insert" on budgets
  for insert with check (family_id is null or family_id = get_user_family_id());

drop policy if exists "budgets_update" on budgets;
create policy "budgets_update" on budgets
  for update using (family_id is null or family_id = get_user_family_id());

drop policy if exists "budgets_delete" on budgets;
create policy "budgets_delete" on budgets
  for delete using (family_id is null or family_id = get_user_family_id());

-- SAVINGS GOALS: personal (user_id) or family
drop policy if exists "savings_goals_select" on savings_goals;
create policy "savings_goals_select" on savings_goals
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "savings_goals_insert" on savings_goals;
create policy "savings_goals_insert" on savings_goals
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "savings_goals_update" on savings_goals;
create policy "savings_goals_update" on savings_goals
  for update using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "savings_goals_delete" on savings_goals;
create policy "savings_goals_delete" on savings_goals
  for delete using (user_id = auth.uid() or family_id = get_user_family_id());

-- DEBTS: personal (user_id) or family
drop policy if exists "debts_select" on debts;
create policy "debts_select" on debts
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "debts_insert" on debts;
create policy "debts_insert" on debts
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "debts_update" on debts;
create policy "debts_update" on debts
  for update using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "debts_delete" on debts;
create policy "debts_delete" on debts
  for delete using (user_id = auth.uid() or family_id = get_user_family_id());

-- ============================================================
-- DEFAULT CATEGORIES (Indonesian)
-- ============================================================
insert into categories (name, type, icon, color, is_default, family_id) values
  -- Expense categories
  ('Makanan & Minuman', 'expense', '🍔', '#ef4444', true, null),
  ('Transport', 'expense', '🚗', '#f59e0b', true, null),
  ('Belanja', 'expense', '🛒', '#8b5cf6', true, null),
  ('Kesehatan', 'expense', '💊', '#ec4899', true, null),
  ('Pendidikan', 'expense', '📚', '#3b82f6', true, null),
  ('Hiburan', 'expense', '🎬', '#06b6d4', true, null),
  ('Pakaian', 'expense', '👕', '#a855f7', true, null),
  ('Tagihan & Utilitas', 'expense', '⚡', '#f97316', true, null),
  ('Rumah', 'expense', '🏠', '#84cc16', true, null),
  ('Komunikasi', 'expense', '📱', '#6366f1', true, null),
  ('Kecantikan & Perawatan', 'expense', '💄', '#f43f5e', true, null),
  ('Olahraga', 'expense', '🏋️', '#10b981', true, null),
  ('Perjalanan', 'expense', '✈️', '#14b8a6', true, null),
  ('Donasi & Sedekah', 'expense', '🤲', '#22c55e', true, null),
  ('Lain-lain', 'expense', '📦', '#6b7280', true, null),
  -- Expense: tabungan & hutang
  ('Tabungan', 'expense', '🐷', '#10b981', true, null),
  ('Cicilan & Hutang', 'expense', '💳', '#ef4444', true, null),
  -- Income categories
  ('Piutang Diterima', 'income', '💰', '#06b6d4', true, null),
  ('Gaji', 'income', '💼', '#10b981', true, null),
  ('Bonus', 'income', '🎁', '#f59e0b', true, null),
  ('Freelance', 'income', '💻', '#3b82f6', true, null),
  ('Investasi', 'income', '📈', '#8b5cf6', true, null),
  ('Bisnis', 'income', '🏪', '#ec4899', true, null),
  ('Kiriman', 'income', '💰', '#06b6d4', true, null),
  ('Lain-lain', 'income', '✨', '#6b7280', true, null)
on conflict do nothing;

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_transactions_family_date on transactions(family_id, date desc);
create index if not exists idx_transactions_user_date on transactions(user_id, date desc);
create index if not exists idx_transactions_family_type on transactions(family_id, type);
create index if not exists idx_transactions_wallet on transactions(wallet_id);
create index if not exists idx_transactions_category on transactions(category_id);
create index if not exists idx_wallets_family on wallets(family_id);
create index if not exists idx_wallets_user on wallets(user_id);
create index if not exists idx_budgets_family_month on budgets(family_id, year, month);
create index if not exists idx_profiles_family on profiles(family_id);
create index if not exists idx_savings_goals_user on savings_goals(user_id);
create index if not exists idx_debts_user on debts(user_id);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on notifications(user_id, is_read, created_at desc);

-- ============================================================
-- Migration: Add Payment History for Savings and Debts
-- ============================================================

-- ============================================================
-- SAVINGS GOALS PAYMENT HISTORY
-- ============================================================
create table if not exists savings_goal_payments (
  id uuid primary key default uuid_generate_v4(),
  goal_id uuid references savings_goals(id) on delete cascade not null,
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  amount numeric(18,2) not null,
  type text not null check (type in ('deposit', 'withdrawal')),
  payment_date date not null default current_date,
  payment_time time not null default current_time,
  wallet_id uuid references wallets(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  transaction_id uuid references transactions(id) on delete set null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table savings_goal_payments enable row level security;

-- RLS Policies for savings_goal_payments
drop policy if exists "savings_payments_select" on savings_goal_payments;
create policy "savings_payments_select" on savings_goal_payments
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "savings_payments_insert" on savings_goal_payments;
create policy "savings_payments_insert" on savings_goal_payments
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "savings_payments_update" on savings_goal_payments;
create policy "savings_payments_update" on savings_goal_payments
  for update using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "savings_payments_delete" on savings_goal_payments;
create policy "savings_payments_delete" on savings_goal_payments
  for delete using (user_id = auth.uid() or family_id = get_user_family_id());

-- Index for performance
create index if not exists idx_savings_payments_goal on savings_goal_payments(goal_id);
create index if not exists idx_savings_payments_date on savings_goal_payments(payment_date desc);

-- ============================================================
-- DEBTS PAYMENT HISTORY
-- ============================================================
create table if not exists debt_payments (
  id uuid primary key default uuid_generate_v4(),
  debt_id uuid references debts(id) on delete cascade not null,
  family_id uuid references families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  amount numeric(18,2) not null,
  payment_date date not null default current_date,
  payment_time time not null default current_time,
  wallet_id uuid references wallets(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  transaction_id uuid references transactions(id) on delete set null,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table debt_payments enable row level security;

-- RLS Policies for debt_payments
drop policy if exists "debt_payments_select" on debt_payments;
create policy "debt_payments_select" on debt_payments
  for select using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "debt_payments_insert" on debt_payments;
create policy "debt_payments_insert" on debt_payments
  for insert with check (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "debt_payments_update" on debt_payments;
create policy "debt_payments_update" on debt_payments
  for update using (user_id = auth.uid() or family_id = get_user_family_id());

drop policy if exists "debt_payments_delete" on debt_payments;
create policy "debt_payments_delete" on debt_payments
  for delete using (user_id = auth.uid() or family_id = get_user_family_id());

-- Index for performance
create index if not exists idx_debt_payments_debt on debt_payments(debt_id);
create index if not exists idx_debt_payments_date on debt_payments(payment_date desc);

-- ============================================================
-- RPC FUNCTION: Add payment to savings goal with optional wallet
-- ============================================================
create or replace function add_savings_payment(
  p_goal_id uuid,
  p_amount numeric,
  p_type text,
  p_payment_date date,
  p_payment_time time,
  p_wallet_id uuid default null,
  p_category_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id uuid;
  v_current_amount numeric;
  v_target_amount numeric;
  v_transaction_id uuid;
  v_payment_id uuid;
begin
  -- Get goal info and verify ownership
  select family_id, user_id, current_amount, target_amount
  into v_family_id, v_user_id, v_current_amount, v_target_amount
  from savings_goals
  where id = p_goal_id;
  
  if v_user_id is null then
    raise exception 'Goal not found';
  end if;
  
  -- Verify caller is the owner
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  
  -- Create transaction if wallet_id is provided
  if p_wallet_id is not null then
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
      case when p_type = 'deposit' then 'expense' else 'income' end,
      abs(p_amount),
      p_payment_date,
      case when p_type = 'deposit' then 'Menabung: ' || (select name from savings_goals where id = p_goal_id)
           else 'Tarik tabungan: ' || (select name from savings_goals where id = p_goal_id)
      end
    )
    returning id into v_transaction_id;
  end if;
  
  -- Insert payment record
  insert into savings_goal_payments (
    goal_id,
    family_id,
    user_id,
    amount,
    type,
    payment_date,
    payment_time,
    wallet_id,
    category_id,
    transaction_id,
    note
  ) values (
    p_goal_id,
    v_family_id,
    v_user_id,
    p_amount,
    p_type,
    p_payment_date,
    p_payment_time,
    p_wallet_id,
    p_category_id,
    v_transaction_id,
    p_note
  )
  returning id into v_payment_id;
  
  -- Update goal amount
  update savings_goals
  set current_amount = current_amount + case when p_type = 'deposit' then p_amount else -p_amount end,
      is_completed = (current_amount + case when p_type = 'deposit' then p_amount else -p_amount end) >= target_amount,
      updated_at = now()
  where id = p_goal_id;
  
  return v_payment_id;
end;
$$;

-- ============================================================
-- RPC FUNCTION: Update savings payment
-- ============================================================
create or replace function update_savings_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_time time,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_id uuid;
  v_old_amount numeric;
  v_old_type text;
  v_diff numeric;
begin
  -- Get payment info
  select goal_id, amount, type
  into v_goal_id, v_old_amount, v_old_type
  from savings_goal_payments
  where id = p_payment_id and user_id = auth.uid();
  
  if v_goal_id is null then
    raise exception 'Payment not found';
  end if;
  
  -- Calculate difference
  v_diff := p_amount - v_old_amount;
  
  -- Update payment record
  update savings_goal_payments
  set amount = p_amount,
      payment_date = p_payment_date,
      payment_time = p_payment_time,
      note = p_note,
      updated_at = now()
  where id = p_payment_id;
  
  -- Update goal amount based on difference
  update savings_goals
  set current_amount = current_amount + case when v_old_type = 'deposit' then v_diff else -v_diff end,
      is_completed = (current_amount + case when v_old_type = 'deposit' then v_diff else -v_diff end) >= target_amount,
      updated_at = now()
  where id = v_goal_id;
end;
$$;

-- ============================================================
-- RPC FUNCTION: Delete savings payment
-- ============================================================
create or replace function delete_savings_payment(
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_id uuid;
  v_amount numeric;
  v_type text;
  v_transaction_id uuid;
begin
  -- Get payment info
  select goal_id, amount, type, transaction_id
  into v_goal_id, v_amount, v_type, v_transaction_id
  from savings_goal_payments
  where id = p_payment_id and user_id = auth.uid();
  
  if v_goal_id is null then
    raise exception 'Payment not found';
  end if;
  
  -- Delete associated transaction if exists
  if v_transaction_id is not null then
    delete from transactions where id = v_transaction_id;
  end if;
  
  -- Delete payment record
  delete from savings_goal_payments where id = p_payment_id;
  
  -- Update goal amount
  update savings_goals
  set current_amount = current_amount - case when v_type = 'deposit' then v_amount else -v_amount end,
      is_completed = (current_amount - case when v_type = 'deposit' then v_amount else -v_amount end) >= target_amount,
      updated_at = now()
  where id = v_goal_id;
end;
$$;

-- ============================================================
-- RPC FUNCTION: Add payment to debt with optional wallet
-- ============================================================
create or replace function add_debt_payment(
  p_debt_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_time time,
  p_wallet_id uuid default null,
  p_category_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id uuid;
  v_remaining numeric;
  v_transaction_id uuid;
  v_payment_id uuid;
  v_debt_type text;
  v_debt_name text;
begin
  -- Get debt info
  select family_id, user_id, remaining_amount, type, name
  into v_family_id, v_user_id, v_remaining, v_debt_type, v_debt_name
  from debts
  where id = p_debt_id;
  
  if v_user_id is null then
    raise exception 'Debt not found';
  end if;
  
  -- Verify caller is the owner
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  
  -- Create transaction if wallet_id is provided
  if p_wallet_id is not null then
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
      case when v_debt_type = 'debt' then 'expense' else 'income' end,
      p_amount,
      p_payment_date,
      case when v_debt_type = 'debt' then 'Bayar hutang: ' || v_debt_name
           else 'Terima piutang: ' || v_debt_name
      end
    )
    returning id into v_transaction_id;
  end if;
  
  -- Insert payment record
  insert into debt_payments (
    debt_id,
    family_id,
    user_id,
    amount,
    payment_date,
    payment_time,
    wallet_id,
    category_id,
    transaction_id,
    note
  ) values (
    p_debt_id,
    v_family_id,
    v_user_id,
    p_amount,
    p_payment_date,
    p_payment_time,
    p_wallet_id,
    p_category_id,
    v_transaction_id,
    p_note
  )
  returning id into v_payment_id;
  
  -- Update debt remaining amount
  update debts
  set remaining_amount = remaining_amount - p_amount,
      is_paid = (remaining_amount - p_amount) <= 0,
      updated_at = now()
  where id = p_debt_id;
  
  return v_payment_id;
end;
$$;

-- ============================================================
-- RPC FUNCTION: Update debt payment
-- ============================================================
create or replace function update_debt_payment(
  p_payment_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_time time,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debt_id uuid;
  v_old_amount numeric;
  v_diff numeric;
begin
  -- Get payment info
  select debt_id, amount
  into v_debt_id, v_old_amount
  from debt_payments
  where id = p_payment_id and user_id = auth.uid();
  
  if v_debt_id is null then
    raise exception 'Payment not found';
  end if;
  
  -- Calculate difference
  v_diff := p_amount - v_old_amount;
  
  -- Update payment record
  update debt_payments
  set amount = p_amount,
      payment_date = p_payment_date,
      payment_time = p_payment_time,
      note = p_note,
      updated_at = now()
  where id = p_payment_id;
  
  -- Update debt remaining amount
  update debts
  set remaining_amount = remaining_amount - v_diff,
      is_paid = (remaining_amount - v_diff) <= 0,
      updated_at = now()
  where id = v_debt_id;
end;
$$;

-- ============================================================
-- RPC FUNCTION: Delete debt payment
-- ============================================================
create or replace function delete_debt_payment(
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debt_id uuid;
  v_amount numeric;
  v_transaction_id uuid;
begin
  -- Get payment info
  select debt_id, amount, transaction_id
  into v_debt_id, v_amount, v_transaction_id
  from debt_payments
  where id = p_payment_id and user_id = auth.uid();
  
  if v_debt_id is null then
    raise exception 'Payment not found';
  end if;
  
  -- Delete associated transaction if exists
  if v_transaction_id is not null then
    delete from transactions where id = v_transaction_id;
  end if;
  
  -- Delete payment record
  delete from debt_payments where id = p_payment_id;
  
  -- Update debt remaining amount
  update debts
  set remaining_amount = remaining_amount + v_amount,
      is_paid = false,
      updated_at = now()
  where id = v_debt_id;
end;
$$;

-- ============================================================
-- RPC FUNCTION: Mark debt as paid with full payment history
-- ============================================================
create or replace function mark_debt_paid_with_payment(
  p_debt_id uuid,
  p_payment_date date,
  p_payment_time time,
  p_wallet_id uuid default null,
  p_category_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id uuid;
  v_remaining numeric;
  v_transaction_id uuid;
  v_payment_id uuid;
  v_debt_type text;
  v_debt_name text;
begin
  -- Get debt info
  select family_id, user_id, remaining_amount, type, name
  into v_family_id, v_user_id, v_remaining, v_debt_type, v_debt_name
  from debts
  where id = p_debt_id;
  
  if v_user_id is null then
    raise exception 'Debt not found';
  end if;
  
  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;
  
  -- Create transaction if wallet_id is provided
  if p_wallet_id is not null then
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
      case when v_debt_type = 'debt' then 'expense' else 'income' end,
      v_remaining,
      p_payment_date,
      'Pelunasan ' || case when v_debt_type = 'debt' then 'hutang: ' else 'piutang: ' end || v_debt_name
    )
    returning id into v_transaction_id;
  end if;
  
  -- Insert payment record
  insert into debt_payments (
    debt_id,
    family_id,
    user_id,
    amount,
    payment_date,
    payment_time,
    wallet_id,
    category_id,
    transaction_id,
    note
  ) values (
    p_debt_id,
    v_family_id,
    v_user_id,
    v_remaining,
    p_payment_date,
    p_payment_time,
    p_wallet_id,
    p_category_id,
    v_transaction_id,
    coalesce(p_note, 'Pelunasan')
  )
  returning id into v_payment_id;
  
  -- Mark debt as fully paid
  update debts
  set remaining_amount = 0,
      is_paid = true,
      updated_at = now()
  where id = p_debt_id;
  
  return v_payment_id;
end;
$$;

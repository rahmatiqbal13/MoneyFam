-- ============================================================
-- Security hardening — jalankan di Supabase SQL Editor
-- (Project → SQL Editor → New query → paste seluruh file ini → Run)
-- Aman dijalankan ulang. Jalankan SETELAH migration_payment_history.sql.
--
-- 1. budgets (HIGH): policy lama mengizinkan semua baris family_id is null,
--    jadi anggaran SEMUA user mode personal bisa dibaca/diubah/dihapus oleh
--    siapa pun yang login. Sekarang dibatasi ke user_id = auth.uid().
--    Kolom budgets.user_id juga ditambahkan (dipakai aplikasi, tapi tidak
--    ada di schema.sql).
-- 2. RPC pembayaran tabungan/hutang (HIGH): security definer tanpa cek
--    kepemilikan p_wallet_id → siapa pun bisa mengubah saldo kantong mana
--    pun lewat trigger saldo. Sekarang kantong & jumlah divalidasi.
--    Sekalian:
--    - anggota keluarga boleh mencatat pembayaran untuk target/hutang
--      keluarga (sebelumnya hanya pembuatnya)
--    - update_*_payment ikut memperbarui transaksi terkait (sebelumnya
--      saldo kantong tidak ikut berubah saat jumlah pembayaran diedit)
--    - RPC lama *_atomic yang tidak dipakai aplikasi dihapus
-- 3. Policy insert/update (LOW): sebelumnya user bisa menulis baris dengan
--    family_id keluarga lain selama user_id = dirinya sendiri.
-- 4. search_path tetap untuk fungsi security definer lama.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: apakah caller boleh memakai kantong ini?
-- ------------------------------------------------------------
create or replace function can_access_wallet(p_wallet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from wallets
    where id = p_wallet_id
    and (
      (family_id is null and user_id = auth.uid())
      or (family_id is not null and family_id = get_user_family_id())
    )
  )
$$;

-- ============================================================
-- 1. BUDGETS
-- ============================================================
alter table budgets add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_budgets_user_month on budgets(user_id, year, month);

drop policy if exists "budgets_select" on budgets;
create policy "budgets_select" on budgets
  for select using (
    (family_id is null and user_id = auth.uid())
    or (family_id is not null and family_id = get_user_family_id())
  );

drop policy if exists "budgets_insert" on budgets;
create policy "budgets_insert" on budgets
  for insert with check (
    (family_id is null and user_id = auth.uid())
    or (family_id is not null and family_id = get_user_family_id())
  );

drop policy if exists "budgets_update" on budgets;
create policy "budgets_update" on budgets
  for update using (
    (family_id is null and user_id = auth.uid())
    or (family_id is not null and family_id = get_user_family_id())
  ) with check (
    (family_id is null and user_id = auth.uid())
    or (family_id is not null and family_id = get_user_family_id())
  );

drop policy if exists "budgets_delete" on budgets;
create policy "budgets_delete" on budgets
  for delete using (
    (family_id is null and user_id = auth.uid())
    or (family_id is not null and family_id = get_user_family_id())
  );

-- ============================================================
-- 2. RPC PEMBAYARAN
-- ============================================================

-- RPC lama, tidak dipakai aplikasi, tanpa validasi kantong
drop function if exists add_to_savings_goal_atomic(uuid, numeric, uuid, uuid, text);
drop function if exists mark_debt_paid_atomic(uuid, uuid, uuid, numeric);
drop function if exists pay_debt_atomic(uuid, numeric, uuid, uuid);

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
  v_goal savings_goals%rowtype;
  v_transaction_id uuid;
  v_payment_id uuid;
begin
  select * into v_goal from savings_goals where id = p_goal_id;

  if not found or not (
    v_goal.user_id = auth.uid()
    or (v_goal.family_id is not null and v_goal.family_id = get_user_family_id())
  ) then
    raise exception 'Goal not found';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;

  if p_type not in ('deposit', 'withdrawal') then
    raise exception 'Tipe pembayaran tidak valid';
  end if;

  if p_wallet_id is not null and not can_access_wallet(p_wallet_id) then
    raise exception 'Kantong tidak ditemukan';
  end if;

  if p_wallet_id is not null then
    insert into transactions (family_id, user_id, wallet_id, category_id, type, amount, date, description)
    values (
      v_goal.family_id,
      auth.uid(),
      p_wallet_id,
      p_category_id,
      case when p_type = 'deposit' then 'expense' else 'income' end,
      p_amount,
      p_payment_date,
      case when p_type = 'deposit' then 'Menabung: ' else 'Tarik tabungan: ' end || v_goal.name
    )
    returning id into v_transaction_id;
  end if;

  insert into savings_goal_payments (
    goal_id, family_id, user_id, amount, type, payment_date, payment_time,
    wallet_id, category_id, transaction_id, note
  ) values (
    p_goal_id, v_goal.family_id, auth.uid(), p_amount, p_type, p_payment_date, p_payment_time,
    p_wallet_id, p_category_id, v_transaction_id, p_note
  )
  returning id into v_payment_id;

  update savings_goals
  set current_amount = current_amount + case when p_type = 'deposit' then p_amount else -p_amount end,
      is_completed = (current_amount + case when p_type = 'deposit' then p_amount else -p_amount end) >= target_amount,
      updated_at = now()
  where id = p_goal_id;

  return v_payment_id;
end;
$$;

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
  v_payment savings_goal_payments%rowtype;
  v_diff numeric;
begin
  select * into v_payment
  from savings_goal_payments
  where id = p_payment_id and user_id = auth.uid();

  if not found then
    raise exception 'Payment not found';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;

  v_diff := p_amount - v_payment.amount;

  update savings_goal_payments
  set amount = p_amount,
      payment_date = p_payment_date,
      payment_time = p_payment_time,
      note = p_note,
      updated_at = now()
  where id = p_payment_id;

  -- Trigger saldo menyesuaikan kantong dari selisih amount
  if v_payment.transaction_id is not null then
    update transactions
    set amount = p_amount, date = p_payment_date, updated_at = now()
    where id = v_payment.transaction_id;
  end if;

  update savings_goals
  set current_amount = current_amount + case when v_payment.type = 'deposit' then v_diff else -v_diff end,
      is_completed = (current_amount + case when v_payment.type = 'deposit' then v_diff else -v_diff end) >= target_amount,
      updated_at = now()
  where id = v_payment.goal_id;
end;
$$;

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
  v_debt debts%rowtype;
  v_transaction_id uuid;
  v_payment_id uuid;
begin
  select * into v_debt from debts where id = p_debt_id;

  if not found or not (
    v_debt.user_id = auth.uid()
    or (v_debt.family_id is not null and v_debt.family_id = get_user_family_id())
  ) then
    raise exception 'Debt not found';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;

  if p_wallet_id is not null and not can_access_wallet(p_wallet_id) then
    raise exception 'Kantong tidak ditemukan';
  end if;

  if p_wallet_id is not null then
    insert into transactions (family_id, user_id, wallet_id, category_id, type, amount, date, description)
    values (
      v_debt.family_id,
      auth.uid(),
      p_wallet_id,
      p_category_id,
      case when v_debt.type = 'debt' then 'expense' else 'income' end,
      p_amount,
      p_payment_date,
      case when v_debt.type = 'debt' then 'Bayar hutang: ' else 'Terima piutang: ' end || v_debt.name
    )
    returning id into v_transaction_id;
  end if;

  insert into debt_payments (
    debt_id, family_id, user_id, amount, payment_date, payment_time,
    wallet_id, category_id, transaction_id, note
  ) values (
    p_debt_id, v_debt.family_id, auth.uid(), p_amount, p_payment_date, p_payment_time,
    p_wallet_id, p_category_id, v_transaction_id, p_note
  )
  returning id into v_payment_id;

  update debts
  set remaining_amount = remaining_amount - p_amount,
      is_paid = (remaining_amount - p_amount) <= 0,
      updated_at = now()
  where id = p_debt_id;

  return v_payment_id;
end;
$$;

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
  v_payment debt_payments%rowtype;
  v_diff numeric;
begin
  select * into v_payment
  from debt_payments
  where id = p_payment_id and user_id = auth.uid();

  if not found then
    raise exception 'Payment not found';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;

  v_diff := p_amount - v_payment.amount;

  update debt_payments
  set amount = p_amount,
      payment_date = p_payment_date,
      payment_time = p_payment_time,
      note = p_note,
      updated_at = now()
  where id = p_payment_id;

  -- Trigger saldo menyesuaikan kantong dari selisih amount
  if v_payment.transaction_id is not null then
    update transactions
    set amount = p_amount, date = p_payment_date, updated_at = now()
    where id = v_payment.transaction_id;
  end if;

  update debts
  set remaining_amount = remaining_amount - v_diff,
      is_paid = (remaining_amount - v_diff) <= 0,
      updated_at = now()
  where id = v_payment.debt_id;
end;
$$;

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
  v_debt debts%rowtype;
  v_transaction_id uuid;
  v_payment_id uuid;
begin
  select * into v_debt from debts where id = p_debt_id;

  if not found or not (
    v_debt.user_id = auth.uid()
    or (v_debt.family_id is not null and v_debt.family_id = get_user_family_id())
  ) then
    raise exception 'Debt not found';
  end if;

  if v_debt.remaining_amount <= 0 then
    raise exception 'Sudah lunas';
  end if;

  if p_wallet_id is not null and not can_access_wallet(p_wallet_id) then
    raise exception 'Kantong tidak ditemukan';
  end if;

  if p_wallet_id is not null then
    insert into transactions (family_id, user_id, wallet_id, category_id, type, amount, date, description)
    values (
      v_debt.family_id,
      auth.uid(),
      p_wallet_id,
      p_category_id,
      case when v_debt.type = 'debt' then 'expense' else 'income' end,
      v_debt.remaining_amount,
      p_payment_date,
      'Pelunasan ' || case when v_debt.type = 'debt' then 'hutang: ' else 'piutang: ' end || v_debt.name
    )
    returning id into v_transaction_id;
  end if;

  insert into debt_payments (
    debt_id, family_id, user_id, amount, payment_date, payment_time,
    wallet_id, category_id, transaction_id, note
  ) values (
    p_debt_id, v_debt.family_id, auth.uid(), v_debt.remaining_amount, p_payment_date, p_payment_time,
    p_wallet_id, p_category_id, v_transaction_id, coalesce(p_note, 'Pelunasan')
  )
  returning id into v_payment_id;

  update debts
  set remaining_amount = 0,
      is_paid = true,
      updated_at = now()
  where id = p_debt_id;

  return v_payment_id;
end;
$$;

-- ============================================================
-- 3. POLICY INSERT/UPDATE: family_id harus milik sendiri
-- ============================================================
do $$
declare
  t text;
  v_check text := '(family_id is null and user_id = auth.uid()) '
               || 'or (family_id is not null and family_id = get_user_family_id())';
begin
  foreach t in array array[
    'wallets', 'transactions', 'transfers', 'savings_goals', 'debts',
    'investments', 'savings_goal_payments', 'debt_payments'
  ] loop
    if to_regclass(t) is null then
      continue;
    end if;

    -- Nama policy lama tidak seragam (savings_goal_payments → savings_payments_*)
    if t = 'savings_goal_payments' then
      execute format('drop policy if exists "savings_payments_insert" on %I', t);
      execute format('create policy "savings_payments_insert" on %I for insert with check (%s)', t, v_check);
    else
      execute format('drop policy if exists "%s_insert" on %I', t, t);
      execute format('create policy "%s_insert" on %I for insert with check (%s)', t, t, v_check);
    end if;

    -- transfers tidak punya policy update
    if t = 'savings_goal_payments' then
      execute format('drop policy if exists "savings_payments_update" on %I', t);
      execute format(
        'create policy "savings_payments_update" on %I for update '
        'using (user_id = auth.uid() or family_id = get_user_family_id()) with check (%s)', t, v_check);
    elsif t <> 'transfers' then
      execute format('drop policy if exists "%s_update" on %I', t, t);
      execute format(
        'create policy "%s_update" on %I for update '
        'using (user_id = auth.uid() or family_id = get_user_family_id()) with check (%s)', t, t, v_check);
    end if;
  end loop;
end $$;

drop policy if exists "categories_insert" on categories;
create policy "categories_insert" on categories
  for insert with check (
    (family_id is null and user_id = auth.uid())
    or (family_id is not null and family_id = get_user_family_id())
  );

drop policy if exists "categories_update" on categories;
create policy "categories_update" on categories
  for update using (
    family_id = get_user_family_id()
    or user_id = auth.uid()
  ) with check (
    (family_id is null and user_id = auth.uid())
    or (family_id is not null and family_id = get_user_family_id())
  );

-- ============================================================
-- 4. search_path tetap untuk fungsi security definer lama
-- ============================================================
do $$
declare
  f text;
begin
  foreach f in array array[
    'get_user_family_id()',
    'get_family_by_invite_code(text)',
    'remove_family_member(uuid)',
    'create_family(text, uuid)',
    'seed_default_categories(uuid)',
    'cleanup_duplicate_categories()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('alter function %s set search_path = public', f);
    end if;
  end loop;
end $$;

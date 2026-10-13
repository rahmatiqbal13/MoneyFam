-- ============================================================
-- Security fixes — jalankan di Supabase SQL Editor
-- (Project → SQL Editor → New query → paste seluruh file ini → Run)
--
-- Berisi 3 perbaikan yang juga sudah disinkronkan ke schema.sql:
-- 1. create_family: tambah verifikasi auth.uid() = p_user_id (CRITICAL —
--    sebelumnya siapa pun yang login bisa merebut family_id/role user lain)
-- 2. delete_all_family_transactions: hanya owner yang boleh (HIGH —
--    sebelumnya anggota biasa bisa menghapus seluruh transaksi keluarga)
-- 3. notifications_insert policy: user_id yang di-insert harus benar
--    anggota family_id tsb (LOW — sebelumnya bisa insert notifikasi utk
--    user_id sembarang selama family_id milik sendiri)
-- ============================================================

-- 1. create_family — CRITICAL
create or replace function create_family(p_name text, p_user_id uuid)
returns uuid as $$
declare
  v_family_id uuid;
  v_profile_exists boolean;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  v_family_id := gen_random_uuid();

  insert into families (id, name) values (v_family_id, p_name);

  select exists(select 1 from profiles where id = p_user_id) into v_profile_exists;

  if v_profile_exists then
    update profiles
    set family_id = v_family_id, role = 'owner'
    where id = p_user_id;
  else
    insert into profiles (id, family_id, role, full_name)
    values (p_user_id, v_family_id, 'owner', split_part(auth.email(), '@', 1));
  end if;

  return v_family_id;
end;
$$ language plpgsql security definer;

-- 2. delete_all_family_transactions — HIGH
create or replace function delete_all_family_transactions(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid()
    and family_id = p_family_id
    and role = 'owner'
  ) then
    raise exception 'Hanya pemilik keluarga yang bisa menghapus semua transaksi';
  end if;

  delete from transactions where family_id = p_family_id;

  update wallets
  set balance = initial_balance
  where family_id = p_family_id;
end;
$$;

-- 3. notifications_insert policy — LOW
drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert" on notifications
  for insert with check (
    (
      family_id is not null
      and family_id = get_user_family_id()
      and exists (
        select 1 from profiles
        where id = notifications.user_id
        and family_id = notifications.family_id
      )
    )
    or
    (
      family_id is null
      and user_id = auth.uid()
    )
  );

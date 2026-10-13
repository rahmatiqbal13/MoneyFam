-- ============================================================
-- Profile role guard — jalankan di Supabase SQL Editor
-- (Project → SQL Editor → New query → paste seluruh file ini → Run)
--
-- Bug (CRITICAL): policy profiles_update hanya mengecek id = auth.uid(),
-- jadi anggota bisa PATCH profilnya sendiri via REST API menjadi
-- role = 'owner' (lalu menghapus semua transaksi keluarga / mengeluarkan
-- anggota lain), atau memindahkan family_id ke keluarga lain tanpa kode
-- undangan. profiles_insert punya celah yang sama.
--
-- Fix: family_id & role hanya boleh diubah lewat fungsi security definer
-- (create_family, remove_family_member, join_family_by_invite_code).
-- Penulisan langsung dari client (role 'authenticated') diblokir trigger.
--
-- Sekalian:
-- - Hapus increment_wallet_balance / decrement_wallet_balance: security
--   definer tanpa cek kepemilikan (siapa pun bisa ubah saldo kantong mana
--   pun) dan tidak dipakai aplikasi.
-- - seed_default_categories hanya untuk keluarga milik pemanggil.
-- ============================================================

-- 1. Hapus RPC saldo yang tidak aman
drop function if exists increment_wallet_balance(uuid, numeric);
drop function if exists decrement_wallet_balance(uuid, numeric);

-- 2. Guard kolom family_id & role pada profiles
create or replace function guard_profile_family_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Fungsi security definer berjalan sebagai owner (bukan 'authenticated')
  if current_user <> 'authenticated' then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.family_id is distinct from OLD.family_id
       or NEW.role is distinct from OLD.role then
      raise exception 'family_id dan role tidak boleh diubah langsung';
    end if;
  elsif NEW.family_id is not null then
    -- INSERT dengan family_id hanya untuk pemilik keluarga yang baru dibuat
    -- (alur registrasi "buat keluarga"), bukan bergabung ke keluarga yang ada.
    if NEW.role <> 'owner' or exists (
      select 1 from profiles where family_id = NEW.family_id
    ) then
      raise exception 'Gunakan kode undangan untuk bergabung ke keluarga';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_guard_profile_family_role on profiles;
create trigger trg_guard_profile_family_role
  before insert or update on profiles
  for each row execute function guard_profile_family_role();

-- 3. Gabung keluarga via kode undangan (menggantikan update profiles dari client)
create or replace function join_family_by_invite_code(p_code text)
returns setof families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family families%rowtype;
  v_user auth.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  select * into v_family from families
  where invite_code = upper(trim(p_code))
  limit 1;

  if not found then
    raise exception 'Kode undangan tidak valid atau sudah tidak berlaku';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    update profiles
    set family_id = v_family.id, role = 'member'
    where id = auth.uid();
  else
    -- Akun tanpa baris profile (zombie account)
    select * into v_user from auth.users where id = auth.uid();
    insert into profiles (id, full_name, email, family_id, role)
    values (
      auth.uid(),
      coalesce(v_user.raw_user_meta_data->>'full_name', split_part(v_user.email, '@', 1), 'User'),
      v_user.email,
      v_family.id,
      'member'
    );
  end if;

  return next v_family;
end;
$$;

-- 4. seed_default_categories: hanya untuk keluarga milik pemanggil
create or replace function seed_default_categories(p_family_id uuid)
returns void as $$
declare
  v_category record;
  v_exists boolean;
begin
  if p_family_id is distinct from get_user_family_id() then
    raise exception 'Not authorized';
  end if;

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

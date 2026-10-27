-- ============================================================
-- Personal mode & pension fix — jalankan di Supabase SQL Editor
-- (Project → SQL Editor → New query → paste seluruh file ini → Run)
-- Aman dijalankan ulang.
--
-- Ditemukan saat uji end-to-end (Oktober 2026) di database live:
--
-- 1. (CRITICAL) Kolom family_id di database live bersifat NOT NULL
--    (schema.sql menyatakan nullable). Akibatnya user mode PERSONAL
--    sama sekali tidak bisa membuat kantong, transaksi, anggaran, target
--    tabungan, hutang, maupun investasi:
--      null value in column "family_id" ... violates not-null constraint
--    Pola yang sama dengan migration_notifications_fix.sql.
--
-- 2. (HIGH) pension_settings tidak punya unique constraint pada user_id,
--    padahal aplikasi menyimpan dengan upsert(onConflict: 'user_id').
--    Tombol Simpan di Dana Pensiun selalu gagal untuk SEMUA user:
--      there is no unique or exclusion constraint matching the
--      ON CONFLICT specification
-- ============================================================

-- 1. family_id boleh null (mode personal)
do $$
declare
  t text;
begin
  foreach t in array array[
    'wallets', 'transactions', 'transfers', 'budgets', 'savings_goals', 'debts',
    'investments', 'savings_goal_payments', 'debt_payments', 'pension_settings', 'categories'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t
      and column_name = 'family_id' and is_nullable = 'NO'
    ) then
      execute format('alter table %I alter column family_id drop not null', t);
      raise notice 'family_id pada % sekarang nullable', t;
    end if;
  end loop;
end $$;

-- 2. pension_settings: satu baris per user
-- Buang duplikat (simpan yang paling baru diubah) sebelum membuat unique index
delete from pension_settings a
using pension_settings b
where a.user_id = b.user_id
  and (coalesce(a.updated_at, a.created_at), a.id) < (coalesce(b.updated_at, b.created_at), b.id);

create unique index if not exists pension_settings_user_id_key on pension_settings(user_id);

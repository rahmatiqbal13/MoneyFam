-- ============================================================
-- Notifications fix — jalankan di Supabase SQL Editor
-- (Project → SQL Editor → New query → paste seluruh file ini → Run)
--
-- Bug: notifications.family_id di-set NOT NULL, tapi user mode personal
-- (tanpa keluarga) selalu insert notifikasi dengan family_id = null.
-- Akibatnya SEMUA notifikasi (termasuk budget_warning yang sudah aktif)
-- gagal diterima user mode personal — insert-nya selalu ditolak database
-- tanpa pernah terlihat oleh user (error hanya di-log ke console).
--
-- Fix ini juga sudah disinkronkan ke schema.sql sebagai source of truth.
-- ============================================================

-- 1. Izinkan family_id null untuk notifikasi mode personal
alter table notifications alter column family_id drop not null;

-- 2. Perbarui policy insert supaya menangani kedua mode dengan benar
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

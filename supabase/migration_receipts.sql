-- ============================================================
-- Migration: Add Receipt Upload Support for Transactions
-- ============================================================

-- Add receipt_url column to transactions table
alter table transactions add column if not exists receipt_url text;

-- Note: Storage bucket must be created manually in Supabase Dashboard
-- Go to: Storage → New Bucket → Name: receipts → Public: false
-- Then add policies manually in the dashboard

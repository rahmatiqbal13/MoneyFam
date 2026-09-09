-- MoneyFam UI redesign: per-member identity + theme prefs.
-- Run in Supabase SQL editor. Safe to re-run.
alter table profiles add column if not exists avatar_color text;
alter table profiles add column if not exists emoji text;
alter table profiles add column if not exists ui_prefs jsonb not null default '{}'::jsonb;

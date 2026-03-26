-- Sync user data across devices via profiles table.
-- Safe to run multiple times.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monitored_persons jsonb        DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS go_bag_checked    jsonb        DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checkin_status    text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checkin_at        timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name         text;

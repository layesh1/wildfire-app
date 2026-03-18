-- Ensure all extended profile columns exist.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone                  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address                text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_email     text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_phone     text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_browser         boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dependents             jsonb   DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pets                   jsonb   DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS special_notes          text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference    text    DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS communication_needs    jsonb   DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS household_languages    text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles                  text[]  DEFAULT ARRAY[]::text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_name               text;

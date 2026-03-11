-- Add caregiver/evacuee profile fields to the profiles table
-- Run this in your Supabase SQL editor: https://app.supabase.com → SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone              text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address            text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_browser     boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dependents         jsonb   DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pets               jsonb   DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS special_notes      text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- ============================================================
-- Invite codes & multi-role support
-- Run in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- ============================================================

-- 1. Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text        UNIQUE NOT NULL,
  role          text        NOT NULL CHECK (role IN ('data_analyst','emergency_responder')),
  org_name      text,                         -- e.g. "LAFD", "UC Berkeley" — shown on signup
  email_domain  text,                         -- optional: restrict to @lafd.org etc.
  specific_email text,                        -- optional: lock to one exact email
  max_uses      int         NOT NULL DEFAULT 1,
  uses          int         NOT NULL DEFAULT 0,
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz                   -- null = never expires
);

-- Only service role can insert/update invite_codes (managed by admin API)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access" ON invite_codes
  USING (true) WITH CHECK (true);

-- 2. Add roles array + org_name to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles    text[]  DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_name text;

-- Backfill roles array from existing role column
UPDATE profiles SET roles = ARRAY[role] WHERE role IS NOT NULL AND (roles = '{}' OR roles IS NULL);

-- 3. Helper function to safely increment invite code uses
CREATE OR REPLACE FUNCTION increment_invite_uses(code_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE invite_codes SET uses = uses + 1 WHERE id = code_id;
$$;

-- 4. Required environment variables (add to Vercel + .env.local):
--    SUPABASE_SERVICE_ROLE_KEY=<your service role key from Supabase Settings → API>
--    ADMIN_SECRET=<random secret you choose, e.g. openssl rand -hex 32>

-- ============================================================
-- Seed: example codes (change or delete before production)
-- ============================================================
-- Single-use data analyst code for a specific email:
-- INSERT INTO invite_codes (code, role, specific_email, max_uses)
--   VALUES ('DA-EXAMPLE-CODE1', 'data_analyst', 'analyst@university.edu', 1);

-- Org code for a fire department (50 uses):
-- INSERT INTO invite_codes (code, role, org_name, email_domain, max_uses)
--   VALUES ('ER-LAFD-EXAMPLE1', 'emergency_responder', 'LAFD', '@lafd.org', 50);

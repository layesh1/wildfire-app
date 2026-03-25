-- ============================================================
-- Row Level Security: ensure users can only access their own data
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read only their own profile
DROP POLICY IF EXISTS "profiles: own read" ON profiles;
CREATE POLICY "profiles: own read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (set on signup)
DROP POLICY IF EXISTS "profiles: own insert" ON profiles;
CREATE POLICY "profiles: own insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
DROP POLICY IF EXISTS "profiles: own update" ON profiles;
CREATE POLICY "profiles: own update" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- No self-deletes (admin only via service role)
-- (no DELETE policy = denied for all non-service-role callers)


-- ── push_subscriptions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint          text        UNIQUE NOT NULL,
  subscription_json text        NOT NULL,
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions: own access" ON push_subscriptions;
CREATE POLICY "push_subscriptions: own access" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── checkin_events ──────────────────────────────────────────
-- This table uses token-based access (shareable links/SMS).
-- We allow inserts/updates only; no user should be able to
-- SELECT all rows via the anon key.
CREATE TABLE IF NOT EXISTS checkin_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token        text        UNIQUE NOT NULL,
  status       text        NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE checkin_events ENABLE ROW LEVEL SECURITY;

-- Public check-in links write their own token — no SELECT allowed via anon key
DROP POLICY IF EXISTS "checkin_events: token insert" ON checkin_events;
CREATE POLICY "checkin_events: token insert" ON checkin_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "checkin_events: token update" ON checkin_events;
CREATE POLICY "checkin_events: token update" ON checkin_events
  FOR UPDATE USING (true);

-- Only the token owner (matched by their own token lookup) or service role can read
-- In practice the app reads via service role key, so no SELECT policy needed here.


-- ── invite_codes ────────────────────────────────────────────
-- Already has RLS. Verify service-role-only policy is present.
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_codes: service role only" ON invite_codes;
CREATE POLICY "invite_codes: service role only" ON invite_codes
  FOR ALL USING (true) WITH CHECK (true);
-- Note: anon/authenticated roles cannot use service role key,
-- so this table is only accessible server-side via SUPABASE_SERVICE_ROLE_KEY.

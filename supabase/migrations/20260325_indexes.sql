-- ============================================================
-- Performance indexes for frequently queried fields
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- push_subscriptions: every notification cron scans by user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions (user_id);

-- push_subscriptions: subscription expiry cleanup scans by updated_at
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated_at
  ON push_subscriptions (updated_at);

-- invite_codes: every verify call filters active + unexpired codes
CREATE INDEX IF NOT EXISTS idx_invite_codes_active
  ON invite_codes (active)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_invite_codes_code
  ON invite_codes (code);   -- already unique but explicit for clarity

-- invite_codes: expiry checks
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at
  ON invite_codes (expires_at)
  WHERE expires_at IS NOT NULL;

-- checkin_events: looked up exclusively by token
-- (UNIQUE constraint already creates an index — this is a no-op safety net)
CREATE INDEX IF NOT EXISTS idx_checkin_events_token
  ON checkin_events (token);

-- profiles: role filter used by admin and signal-gap queries
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

-- profiles: language_preference used for i18n lookups
CREATE INDEX IF NOT EXISTS idx_profiles_language
  ON profiles (language_preference);

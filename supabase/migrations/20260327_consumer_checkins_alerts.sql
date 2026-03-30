-- Evacuee status rows (dashboard Safety Check-In) — own user only
CREATE TABLE IF NOT EXISTS evacuee_records (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL,
  location_name text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE evacuee_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evacuee_records: own all" ON evacuee_records;
CREATE POLICY "evacuee_records: own all" ON evacuee_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Caregiver updates status on behalf of a monitored person (no linked auth user)
CREATE TABLE IF NOT EXISTS monitored_person_checkins (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monitored_person_id  text NOT NULL,
  status               text NOT NULL,
  location_name        text,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caregiver_user_id, monitored_person_id)
);

ALTER TABLE monitored_person_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitored_person_checkins: caregiver own" ON monitored_person_checkins;
CREATE POLICY "monitored_person_checkins: caregiver own" ON monitored_person_checkins
  FOR ALL USING (auth.uid() = caregiver_user_id) WITH CHECK (auth.uid() = caregiver_user_id);

-- Optional persisted alert items (client can also compute without this)
CREATE TABLE IF NOT EXISTS user_alert_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  severity    text,
  title       text NOT NULL,
  body        text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  read_at     timestamptz,
  dismissed_at timestamptz
);

CREATE INDEX IF NOT EXISTS user_alert_items_user_created ON user_alert_items (user_id, created_at DESC);

ALTER TABLE user_alert_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_alert_items: own" ON user_alert_items;
CREATE POLICY "user_alert_items: own" ON user_alert_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI / alert preferences on profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alerts_ai_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alert_radius_miles numeric DEFAULT 25;

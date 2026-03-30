-- Flameo push escalation cadence (Phase C ANISHA)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_flameo_push_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_flameo_push_level int;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_flameo_status_prompt_at timestamptz;

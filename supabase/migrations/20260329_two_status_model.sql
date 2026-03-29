-- ═══════════════════════════════════════════════════════════════════════════
-- Two-status model on profiles (home evacuation vs personal safety).
-- MANUAL: Apply in Supabase Dashboard → SQL Editor (do not rely on CI alone).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles: new columns ───────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_evacuation_status text DEFAULT 'not_evacuated';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS person_safety_status text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS safety_shelter_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS safety_location_note text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_status_updated_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS safety_status_updated_at timestamptz;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_home_evacuation_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_home_evacuation_status_check
  CHECK (home_evacuation_status IN ('not_evacuated', 'evacuated', 'cannot_evacuate'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_person_safety_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_person_safety_status_check
  CHECK (
    person_safety_status IS NULL
    OR person_safety_status IN ('safe', 'at_shelter', 'safe_elsewhere', 'need_help')
  );

-- ── Backfill from evacuee_records (legacy single status) ────────────────────
UPDATE profiles p
SET
  home_evacuation_status = CASE er.status
    WHEN 'evacuated' THEN 'evacuated'
    WHEN 'sheltering' THEN 'evacuated'
    WHEN 'returning' THEN 'not_evacuated'
    WHEN 'unknown' THEN 'not_evacuated'
    WHEN 'safe' THEN 'not_evacuated'
    WHEN 'need_help' THEN 'cannot_evacuate'
    WHEN 'not_evacuated' THEN 'not_evacuated'
    WHEN 'cannot_evacuate' THEN 'cannot_evacuate'
    ELSE COALESCE(p.home_evacuation_status, 'not_evacuated')
  END,
  person_safety_status = CASE er.status
    WHEN 'evacuated' THEN 'safe'
    WHEN 'sheltering' THEN 'at_shelter'
    WHEN 'returning' THEN 'safe'
    WHEN 'unknown' THEN NULL
    WHEN 'safe' THEN 'safe'
    WHEN 'need_help' THEN 'need_help'
    ELSE p.person_safety_status
  END,
  home_status_updated_at = COALESCE(er.updated_at, p.home_status_updated_at),
  safety_status_updated_at = CASE
    WHEN er.status IN ('evacuated', 'sheltering', 'returning', 'safe', 'need_help')
      THEN COALESCE(er.updated_at, p.safety_status_updated_at)
    ELSE p.safety_status_updated_at
  END
FROM evacuee_records er
WHERE er.user_id = p.id;

-- Normalize evacuee_records.status to home-evacuation values (for feeds / legacy readers)
UPDATE evacuee_records SET status = CASE status
  WHEN 'evacuated' THEN 'evacuated'
  WHEN 'sheltering' THEN 'evacuated'
  WHEN 'returning' THEN 'not_evacuated'
  WHEN 'unknown' THEN 'not_evacuated'
  WHEN 'safe' THEN 'not_evacuated'
  WHEN 'need_help' THEN 'cannot_evacuate'
  WHEN 'not_evacuated' THEN 'not_evacuated'
  WHEN 'cannot_evacuate' THEN 'cannot_evacuate'
  ELSE 'not_evacuated'
END
WHERE status IS NOT NULL;

-- Monitored rows: map legacy → home evacuation enum stored in status column
UPDATE monitored_person_checkins SET status = CASE status
  WHEN 'evacuated' THEN 'evacuated'
  WHEN 'sheltering' THEN 'evacuated'
  WHEN 'returning' THEN 'not_evacuated'
  WHEN 'unknown' THEN 'not_evacuated'
  WHEN 'safe' THEN 'not_evacuated'
  WHEN 'need_help' THEN 'cannot_evacuate'
  WHEN 'not_evacuated' THEN 'not_evacuated'
  WHEN 'cannot_evacuate' THEN 'cannot_evacuate'
  ELSE 'not_evacuated'
END
WHERE status IS NOT NULL;

-- ── Responder reads: limited columns only (no person_safety_* on wire) ─────
-- Callers with role emergency_responder use this RPC; RLS on profiles stays own-row only.
CREATE OR REPLACE FUNCTION public.profiles_visible_to_responder()
RETURNS TABLE (
  id uuid,
  home_evacuation_status text,
  home_status_updated_at timestamptz,
  address text,
  full_name text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.home_evacuation_status, p.home_status_updated_at, p.address, p.full_name, p.phone
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'emergency_responder'
  );
$$;

REVOKE ALL ON FUNCTION public.profiles_visible_to_responder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_visible_to_responder() TO authenticated;

COMMENT ON FUNCTION public.profiles_visible_to_responder() IS
  'Returns allowed profile fields for emergency_responder map/list UIs. Empty set if caller is not a responder.';

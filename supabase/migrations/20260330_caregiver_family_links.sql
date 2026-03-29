-- Caregiver ↔ evacuee family links (add by email). MANUAL: run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS caregiver_family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evacuee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (caregiver_user_id, evacuee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_caregiver_family_links_caregiver ON caregiver_family_links (caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_family_links_evacuee ON caregiver_family_links (evacuee_user_id);

ALTER TABLE caregiver_family_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caregiver_family_links: caregiver all own" ON caregiver_family_links;
CREATE POLICY "caregiver_family_links: caregiver all own" ON caregiver_family_links
  FOR ALL TO authenticated
  USING (auth.uid() = caregiver_user_id)
  WITH CHECK (auth.uid() = caregiver_user_id);

DROP POLICY IF EXISTS "caregiver_family_links: evacuee read" ON caregiver_family_links;
CREATE POLICY "caregiver_family_links: evacuee read" ON caregiver_family_links
  FOR SELECT TO authenticated
  USING (auth.uid() = evacuee_user_id);

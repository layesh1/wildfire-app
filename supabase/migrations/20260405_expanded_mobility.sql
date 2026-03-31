-- Expanded mobility / health fields, responder consent, and responder read rules.
-- MANUAL: Apply in Supabase Dashboard → SQL Editor if your project does not auto-run migrations.
-- (Spec referenced 20260330_expanded_mobility.sql; this file uses 20260405 so it runs after existing migrations.)

-- ── profiles: new columns ───────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobility_needs text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disability_needs text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disability_other text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medical_needs text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS medical_other text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS responder_data_consent boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS responder_data_consent_at timestamptz;

COMMENT ON COLUMN public.profiles.mobility_needs IS 'Multi-select: Mobility & Movement onboarding options.';
COMMENT ON COLUMN public.profiles.disability_needs IS 'Multi-select: Disabilities onboarding options.';
COMMENT ON COLUMN public.profiles.disability_other IS 'Free text when Other disability selected; max 100 chars in app.';
COMMENT ON COLUMN public.profiles.medical_needs IS 'Multi-select: Medical conditions & equipment onboarding options.';
COMMENT ON COLUMN public.profiles.medical_other IS 'Free text when Other medical selected; max 150 chars in app.';
COMMENT ON COLUMN public.profiles.responder_data_consent IS 'If true, evacuee/caregiver consented to responder visibility during incidents.';
COMMENT ON COLUMN public.profiles.responder_data_consent_at IS 'Timestamp when consent was recorded.';

CREATE INDEX IF NOT EXISTS idx_profiles_responder_data_consent
  ON public.profiles (responder_data_consent)
  WHERE responder_data_consent IS TRUE;

-- ── RLS: emergency_responder may read other users profiles only when consented ──
DROP POLICY IF EXISTS "profiles: responder read consented" ON public.profiles;
CREATE POLICY "profiles: responder read consented" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT pr.role FROM public.profiles pr WHERE pr.id = auth.uid()) = 'emergency_responder'::text
    AND public.profiles.responder_data_consent IS TRUE
  );

-- ── Responder RPC: only consented profiles; include mobility fields for map UIs ──
-- Postgres cannot change RETURNS TABLE with CREATE OR REPLACE; drop first.
DROP FUNCTION IF EXISTS public.profiles_visible_to_responder();

CREATE FUNCTION public.profiles_visible_to_responder()
RETURNS TABLE (
  id uuid,
  home_evacuation_status text,
  home_status_updated_at timestamptz,
  address text,
  full_name text,
  phone text,
  mobility_needs text[],
  medical_needs text[],
  disability_other text,
  medical_other text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.home_evacuation_status,
    p.home_status_updated_at,
    p.address,
    p.full_name,
    p.phone,
    p.mobility_needs,
    p.medical_needs,
    p.disability_other,
    p.medical_other
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'emergency_responder'::text
  )
  AND p.responder_data_consent IS TRUE;
$$;

REVOKE ALL ON FUNCTION public.profiles_visible_to_responder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_visible_to_responder() TO authenticated;

COMMENT ON FUNCTION public.profiles_visible_to_responder() IS
  'Limited profile fields for responder map/list; only rows with responder_data_consent = true.';

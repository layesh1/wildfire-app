-- Consent flags + responder visibility RPC update.
-- MANUAL: Apply in Supabase SQL Editor (not auto-run in all environments).
-- Ordering: If 20260405_expanded_mobility.sql was applied after this file, it may have replaced the RPC/RLS
-- with responder_data_consent-only rules — re-apply the policy + profiles_visible_to_responder() section
-- from this file afterward so location_sharing_consent, evacuation_status_consent, and health_data_consent gating apply.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_sharing_consent boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS evacuation_status_consent boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS health_data_consent boolean DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS my_people_consent_shown boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.location_sharing_consent IS 'User consents to share address/location with responders during incidents.';
COMMENT ON COLUMN public.profiles.evacuation_status_consent IS 'User consents to share evacuation status with responders during incidents.';
COMMENT ON COLUMN public.profiles.health_data_consent IS 'User consents to share mobility/health fields with responders.';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'When onboarding T&C was accepted.';
COMMENT ON COLUMN public.profiles.my_people_consent_shown IS 'User acknowledged My People invite disclosure.';

-- RLS: responders may read profiles only when location + evacuation consents are true
DROP POLICY IF EXISTS "profiles: responder read consented" ON public.profiles;
CREATE POLICY "profiles: responder read consented" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT pr.role FROM public.profiles pr WHERE pr.id = auth.uid()) = 'emergency_responder'::text
    AND public.profiles.location_sharing_consent IS TRUE
    AND public.profiles.evacuation_status_consent IS TRUE
  );

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
    CASE WHEN p.health_data_consent IS TRUE THEN p.mobility_needs ELSE NULL END,
    CASE WHEN p.health_data_consent IS TRUE THEN p.medical_needs ELSE NULL END,
    CASE WHEN p.health_data_consent IS TRUE THEN p.disability_other ELSE NULL END,
    CASE WHEN p.health_data_consent IS TRUE THEN p.medical_other ELSE NULL END
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'emergency_responder'::text
  )
  AND p.location_sharing_consent IS TRUE
  AND p.evacuation_status_consent IS TRUE;
$$;

REVOKE ALL ON FUNCTION public.profiles_visible_to_responder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_visible_to_responder() TO authenticated;

COMMENT ON FUNCTION public.profiles_visible_to_responder() IS
  'Responder map/list: location + evacuation consent required; health/mobility fields only if health_data_consent.';

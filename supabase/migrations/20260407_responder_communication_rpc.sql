-- Extend profiles_visible_to_responder() with communication_needs + special_notes
-- (cognitive, behavioral, communication chips + responder guidance live here).
-- MANUAL: Apply in Supabase Dashboard → SQL Editor if migrations are not auto-applied.

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
  medical_other text,
  communication_needs jsonb,
  special_notes text
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
    p.medical_other,
    COALESCE(p.communication_needs, '[]'::jsonb),
    NULLIF(trim(p.special_notes), '')
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
  'Limited profile fields for responder map/list; responder_data_consent = true. Includes communication_needs (jsonb) and special_notes.';

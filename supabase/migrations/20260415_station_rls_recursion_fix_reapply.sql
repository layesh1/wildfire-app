-- Fix "infinite recursion detected in policy for relation stations".
-- Order matters: drop policies that call station_ids_for_user first, then fix the function,
-- then re-create policies. Safe to run if 20260413/20260414 were partially applied.

DROP POLICY IF EXISTS station_firefighters_select_same_station ON public.station_firefighters;
DROP POLICY IF EXISTS station_invite_codes_select_same_station ON public.station_invite_codes;

CREATE OR REPLACE FUNCTION public.station_ids_for_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT s.id
  FROM public.stations s
  WHERE s.is_active = true AND s.created_by = auth.uid()
  UNION
  SELECT sf.station_id
  FROM public.station_firefighters sf
  WHERE sf.firefighter_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.station_ids_for_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.station_ids_for_user() TO authenticated;

COMMENT ON FUNCTION public.station_ids_for_user() IS
  'Station IDs the user commands or belongs to; RLS helper. MUST use row_security = off to avoid recursion with stations policies.';

CREATE POLICY station_firefighters_select_same_station ON public.station_firefighters
  FOR SELECT TO authenticated
  USING (station_id IN (SELECT public.station_ids_for_user()));

CREATE POLICY station_invite_codes_select_same_station ON public.station_invite_codes
  FOR SELECT TO authenticated
  USING (station_id IN (SELECT public.station_ids_for_user()));

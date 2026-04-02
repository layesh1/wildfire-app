-- Let commanders and station members read roster + active invite context without service role.
-- SECURITY DEFINER avoids RLS recursion when policies reference station_firefighters.

CREATE OR REPLACE FUNCTION public.station_ids_for_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
  'Station IDs the current user commands or belongs to; used by RLS for roster/invite reads.';

CREATE POLICY station_firefighters_select_same_station ON public.station_firefighters
  FOR SELECT TO authenticated
  USING (station_id IN (SELECT public.station_ids_for_user()));

CREATE POLICY station_invite_codes_select_same_station ON public.station_invite_codes
  FOR SELECT TO authenticated
  USING (station_id IN (SELECT public.station_ids_for_user()));

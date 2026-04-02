-- Break stations ↔ station_firefighters RLS cycles: the original stations_select used
-- EXISTS (SELECT … FROM station_firefighters), which re-evaluated station_firefighters RLS,
-- which could recurse back into stations even when station_ids_for_user() is fixed.
-- This policy calls a SECURITY DEFINER helper with row_security off for all inner reads.

DROP POLICY IF EXISTS stations_select ON public.stations;

CREATE OR REPLACE FUNCTION public.user_can_read_station(p_station_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stations s
    WHERE s.id = p_station_id
      AND s.is_active = true
      AND s.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.station_firefighters sf
    WHERE sf.station_id = p_station_id
      AND sf.firefighter_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_read_station(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_read_station(uuid) TO authenticated;

COMMENT ON FUNCTION public.user_can_read_station(uuid) IS
  'RLS helper: true if current user may read this station row (commander or roster member). Uses row_security = off to avoid policy recursion.';

CREATE POLICY stations_select ON public.stations
  FOR SELECT TO authenticated
  USING (public.user_can_read_station(id));

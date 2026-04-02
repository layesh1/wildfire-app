-- Fix: infinite recursion on stations SELECT — policies on station_firefighters call
-- station_ids_for_user(), which read stations/station_firefighters under the caller's RLS.
-- Bypass RLS inside this SECURITY DEFINER helper (same pattern as auth_profile_role).

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

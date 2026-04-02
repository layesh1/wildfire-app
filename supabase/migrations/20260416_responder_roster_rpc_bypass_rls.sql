-- Roster reads without relying on broken stations ↔ station_firefighters RLS recursion.
-- Use when SUPABASE_SERVICE_ROLE_KEY is unset (local dev) or as a safety net.
-- Also re-applies station_ids_for_user with row_security = off (idempotent).

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
  'Station IDs the user commands or belongs to; RLS helper. MUST use row_security = off.';

CREATE OR REPLACE FUNCTION public.resolve_responder_station_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (
      SELECT s.id
      FROM public.stations s
      WHERE s.is_active = true AND s.created_by = auth.uid()
      ORDER BY s.created_at ASC
      LIMIT 1
    ),
    (
      SELECT sf.station_id
      FROM public.station_firefighters sf
      WHERE sf.firefighter_id = auth.uid()
      ORDER BY sf.joined_at ASC NULLS LAST
      LIMIT 1
    )
  );
$$;

REVOKE ALL ON FUNCTION public.resolve_responder_station_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_responder_station_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.fetch_responder_station(p_station_id uuid)
RETURNS TABLE (
  id uuid,
  station_name text,
  incident_name text,
  incident_zone text,
  created_at timestamptz,
  created_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT s.id, s.station_name, s.incident_name, s.incident_zone, s.created_at, s.created_by
  FROM public.stations s
  WHERE s.id = p_station_id
    AND s.is_active = true
    AND (
      s.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.station_firefighters sf
        WHERE sf.station_id = s.id AND sf.firefighter_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.fetch_responder_station(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_responder_station(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_station_firefighters_for_responder(p_station_id uuid)
RETURNS TABLE (
  id uuid,
  firefighter_id uuid,
  joined_at timestamptz,
  last_seen_at timestamptz,
  current_lat double precision,
  current_lng double precision,
  current_assignment text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    sf.id,
    sf.firefighter_id,
    sf.joined_at,
    sf.last_seen_at,
    sf.current_lat,
    sf.current_lng,
    sf.current_assignment,
    sf.status::text
  FROM public.station_firefighters sf
  WHERE sf.station_id = p_station_id
    AND EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = p_station_id
        AND s.is_active = true
        AND (
          s.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.station_firefighters m
            WHERE m.station_id = s.id AND m.firefighter_id = auth.uid()
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.list_station_firefighters_for_responder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_station_firefighters_for_responder(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fetch_active_station_invite_for_responder(p_station_id uuid)
RETURNS TABLE (
  code text,
  expires_at timestamptz,
  uses_count int,
  max_uses int,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT c.code, c.expires_at, c.uses_count, c.max_uses, c.is_active
  FROM public.station_invite_codes c
  WHERE c.station_id = p_station_id
    AND c.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = p_station_id
        AND s.is_active = true
        AND s.created_by = auth.uid()
    )
  ORDER BY c.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fetch_active_station_invite_for_responder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_active_station_invite_for_responder(uuid) TO authenticated;

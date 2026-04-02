-- Station + invite codes + firefighter roster (command ↔ field).
-- Apply manually in Supabase if migrations are not auto-run.

CREATE TABLE IF NOT EXISTS public.stations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  station_name text NOT NULL,
  incident_name text,
  incident_zone text,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.station_invite_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  max_uses int DEFAULT 50,
  uses_count int DEFAULT 0,
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.station_firefighters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  firefighter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_seen_at timestamptz,
  current_lat double precision,
  current_lng double precision,
  current_assignment text,
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'off_duty', 'unavailable')),
  UNIQUE (station_id, firefighter_id)
);

CREATE INDEX IF NOT EXISTS idx_station_invite_codes_code ON public.station_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_station_invite_codes_station ON public.station_invite_codes(station_id);
CREATE INDEX IF NOT EXISTS idx_station_firefighters_station ON public.station_firefighters(station_id);
CREATE INDEX IF NOT EXISTS idx_station_firefighters_firefighter ON public.station_firefighters(firefighter_id);

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_firefighters ENABLE ROW LEVEL SECURITY;

-- Stations: members can read; creator can update
CREATE POLICY stations_select ON public.stations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.station_firefighters sf
      WHERE sf.station_id = stations.id AND sf.firefighter_id = auth.uid()
    )
  );

CREATE POLICY stations_insert ON public.stations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role::text = 'emergency_responder'
          OR 'emergency_responder' = ANY (COALESCE(p.roles, ARRAY[]::text[]))
        )
    )
  );

CREATE POLICY stations_update_creator ON public.stations
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Invite codes: station creator only (server-side validate/accept use service role)
CREATE POLICY station_invite_codes_select ON public.station_invite_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = station_invite_codes.station_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY station_invite_codes_insert ON public.station_invite_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = station_invite_codes.station_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY station_invite_codes_update ON public.station_invite_codes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = station_invite_codes.station_id AND s.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = station_invite_codes.station_id AND s.created_by = auth.uid()
    )
  );

-- Roster: read if commander or member; update own row (location/status)
CREATE POLICY station_firefighters_select ON public.station_firefighters
  FOR SELECT TO authenticated
  USING (
    firefighter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.stations s
      WHERE s.id = station_firefighters.station_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY station_firefighters_update_own ON public.station_firefighters
  FOR UPDATE TO authenticated
  USING (firefighter_id = auth.uid())
  WITH CHECK (firefighter_id = auth.uid());

COMMENT ON TABLE public.stations IS 'Incident command post / station metadata; creator manages invites.';
COMMENT ON TABLE public.station_invite_codes IS 'Time-limited codes for firefighters to join a station (validated/accepted via API).';
COMMENT ON TABLE public.station_firefighters IS 'Firefighter membership and last-known map position for command hub.';

-- Enable Realtime for this table in Supabase Dashboard → Database → Replication, or:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.station_firefighters;

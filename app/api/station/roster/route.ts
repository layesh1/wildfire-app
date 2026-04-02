import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase-service-role'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'

export type StationRosterMember = {
  id: string
  firefighter_id: string
  full_name: string | null
  joined_at: string | null
  last_seen_at: string | null
  current_lat: number | null
  current_lng: number | null
  current_assignment: string | null
  status: string | null
}

const EMPTY = {
  station: null,
  active_invite: null,
  members: [] as StationRosterMember[],
}

/**
 * Members of the caller's station (creator or firefighter).
 * No service role required when the user has no station, or when RLS allows reads
 * (see migration 20260413_station_scope_rls_for_roster.sql). Service role still used
 * when configured for reliable cross-profile names.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .maybeSingle()

  if (!isEmergencyResponder(me?.role, me?.roles as string[] | null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: asCreator } = await supabase
    .from('stations')
    .select('id, station_name, incident_name, incident_zone, created_at')
    .eq('created_by', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  let stationId: string | null = asCreator?.id ?? null

  if (!stationId) {
    const { data: membership } = await supabase
      .from('station_firefighters')
      .select('station_id')
      .eq('firefighter_id', user.id)
      .limit(1)
      .maybeSingle()
    stationId = membership?.station_id ?? null
  }

  if (!stationId) {
    return NextResponse.json(EMPTY)
  }

  const admin = createServiceRoleClient()
  const db = admin ?? supabase

  const { data: station, error: stErr } = await db
    .from('stations')
    .select('id, station_name, incident_name, incident_zone, created_at, created_by')
    .eq('id', stationId)
    .maybeSingle()

  if (stErr || !station) {
    return NextResponse.json(
      { error: stErr?.message ?? 'Station not found' },
      { status: 500 }
    )
  }

  const { data: rows, error: rowsErr } = await db
    .from('station_firefighters')
    .select('id, firefighter_id, joined_at, last_seen_at, current_lat, current_lng, current_assignment, status')
    .eq('station_id', stationId)

  if (rowsErr) {
    return NextResponse.json({ error: rowsErr.message }, { status: 500 })
  }

  const ffIds = [...new Set((rows ?? []).map(r => r.firefighter_id as string).filter(Boolean))]
  let names = new Map<string, string | null>()
  if (ffIds.length > 0) {
    const { data: profs } = await db.from('profiles').select('id, full_name').in('id', ffIds)
    names = new Map((profs ?? []).map(p => [p.id as string, (p.full_name as string | null) ?? null]))
  }

  const { data: activeCode } = await supabase
    .from('station_invite_codes')
    .select('code, expires_at, uses_count, max_uses, is_active')
    .eq('station_id', stationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const members: StationRosterMember[] = (rows ?? []).map(r => ({
    id: r.id as string,
    firefighter_id: r.firefighter_id as string,
    full_name: names.get(r.firefighter_id as string) ?? null,
    joined_at: r.joined_at as string | null,
    last_seen_at: r.last_seen_at as string | null,
    current_lat: typeof r.current_lat === 'number' ? r.current_lat : null,
    current_lng: typeof r.current_lng === 'number' ? r.current_lng : null,
    current_assignment: typeof r.current_assignment === 'string' ? r.current_assignment : null,
    status: typeof r.status === 'string' ? r.status : null,
  }))

  return NextResponse.json({
    station: {
      id: station.id,
      station_name: station.station_name,
      incident_name: station.incident_name,
      incident_zone: station.incident_zone,
      created_at: station.created_at,
      is_commander: station.created_by === user.id,
    },
    active_invite: activeCode
      ? {
          code: activeCode.code,
          expires_at: activeCode.expires_at,
          uses_count: activeCode.uses_count,
          max_uses: activeCode.max_uses,
        }
      : null,
    members,
  })
}

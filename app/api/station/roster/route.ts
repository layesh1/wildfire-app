import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase-service-role'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'

function isRlsRecursionMessage(msg: string | undefined): boolean {
  if (!msg) return false
  return /infinite recursion/i.test(msg) || /policy for relation.*stations/i.test(msg)
}

function rosterErrorResponse(raw: string | undefined, status = 500) {
  const msg = raw ?? 'Unknown error'
  if (isRlsRecursionMessage(msg)) {
    return NextResponse.json(
      {
        error:
          'Supabase RLS recursion on stations. Run migrations 20260415_station_rls_recursion_fix_reapply.sql and 20260416_responder_roster_rpc_bypass_rls.sql in the SQL Editor (or apply the full migration chain), then refresh.',
        code: 'STATIONS_RLS_RECURSION',
      },
      { status }
    )
  }
  if (
    /resolve_responder_station_id|fetch_responder_station|list_station_firefighters_for_responder|fetch_active_station_invite/i.test(
      msg
    ) &&
    /schema cache|does not exist|not find the function/i.test(msg)
  ) {
    return NextResponse.json(
      {
        error:
          'Station roster RPCs are missing. Run migration 20260416_responder_roster_rpc_bypass_rls.sql, or set SUPABASE_SERVICE_ROLE_KEY so the API can read stations without RLS.',
        code: 'STATION_ROSTER_RPC_MISSING',
      },
      { status: 503 }
    )
  }
  return NextResponse.json({ error: msg }, { status })
}

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

type StationRow = {
  id: string
  station_name: string
  incident_name: string | null
  incident_zone: string | null
  created_at: string
  created_by: string
}

type FfRow = {
  id: string
  firefighter_id: string
  joined_at: string | null
  last_seen_at: string | null
  current_lat: number | null
  current_lng: number | null
  current_assignment: string | null
  status: string | null
}

/**
 * Members of the caller's station (creator or firefighter).
 * Prefers service role (bypasses RLS) when SUPABASE_SERVICE_ROLE_KEY is set.
 * Otherwise uses SECURITY DEFINER RPCs from 20260416_responder_roster_rpc_bypass_rls.sql.
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

  const admin = createServiceRoleClient()
  const userId = user.id
  const profilesClient = admin ?? supabase

  let stationId: string | null = null
  let station: StationRow | null = null
  let rows: FfRow[] = []
  let activeCode: {
    code: string
    expires_at: string | null
    uses_count: number | null
    max_uses: number | null
  } | null = null

  if (admin) {
    const { data: asCreator, error: cErr } = await admin
      .from('stations')
      .select('id')
      .eq('created_by', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (cErr) {
      return rosterErrorResponse(cErr.message)
    }

    stationId = asCreator?.id ?? null

    if (!stationId) {
      const { data: membership, error: mErr } = await admin
        .from('station_firefighters')
        .select('station_id')
        .eq('firefighter_id', userId)
        .limit(1)
        .maybeSingle()

      if (mErr) {
        return rosterErrorResponse(mErr.message)
      }
      stationId = membership?.station_id ?? null
    }

    if (!stationId) {
      return NextResponse.json(EMPTY)
    }

    const { data: st, error: stErr } = await admin
      .from('stations')
      .select('id, station_name, incident_name, incident_zone, created_at, created_by')
      .eq('id', stationId)
      .maybeSingle()

    if (stErr || !st) {
      return rosterErrorResponse(stErr?.message ?? 'Station not found')
    }
    station = st as StationRow

    const { data: ffRows, error: ffErr } = await admin
      .from('station_firefighters')
      .select('id, firefighter_id, joined_at, last_seen_at, current_lat, current_lng, current_assignment, status')
      .eq('station_id', stationId)

    if (ffErr) {
      return rosterErrorResponse(ffErr.message)
    }
    rows = (ffRows ?? []) as FfRow[]

    if (station.created_by === userId) {
      const { data: inv } = await admin
        .from('station_invite_codes')
        .select('code, expires_at, uses_count, max_uses')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      activeCode = inv
        ? {
            code: inv.code as string,
            expires_at: inv.expires_at as string | null,
            uses_count: inv.uses_count as number | null,
            max_uses: inv.max_uses as number | null,
          }
        : null
    }
  } else {
    const { data: rid, error: rErr } = await supabase.rpc('resolve_responder_station_id')
    if (rErr) {
      return rosterErrorResponse(rErr.message)
    }
    if (rid == null || rid === '') {
      return NextResponse.json(EMPTY)
    }
    stationId = rid as string

    const { data: stRows, error: stErr } = await supabase.rpc('fetch_responder_station', {
      p_station_id: stationId,
    })

    if (stErr) {
      return rosterErrorResponse(stErr.message)
    }

    const st = Array.isArray(stRows) ? stRows[0] : stRows
    if (!st) {
      return rosterErrorResponse('Station not found')
    }
    station = st as StationRow

    const { data: ffRows, error: ffErr } = await supabase.rpc('list_station_firefighters_for_responder', {
      p_station_id: stationId,
    })

    if (ffErr) {
      return rosterErrorResponse(ffErr.message)
    }
    rows = (ffRows ?? []) as FfRow[]

    const { data: invRows, error: invErr } = await supabase.rpc('fetch_active_station_invite_for_responder', {
      p_station_id: stationId,
    })

    if (invErr) {
      return rosterErrorResponse(invErr.message)
    }

    const inv = Array.isArray(invRows) ? invRows[0] : invRows
    activeCode = inv
      ? {
          code: inv.code as string,
          expires_at: inv.expires_at as string | null,
          uses_count: inv.uses_count as number | null,
          max_uses: inv.max_uses as number | null,
        }
      : null
  }

  if (!station) {
    return rosterErrorResponse('Station not found')
  }

  const ffIds = [...new Set(rows.map(r => r.firefighter_id as string).filter(Boolean))]
  let names = new Map<string, string | null>()
  if (ffIds.length > 0) {
    const { data: profs } = await profilesClient.from('profiles').select('id, full_name').in('id', ffIds)
    names = new Map((profs ?? []).map(p => [p.id as string, (p.full_name as string | null) ?? null]))
  }

  const members: StationRosterMember[] = rows.map(r => ({
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
      is_commander: station.created_by === userId,
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

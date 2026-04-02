import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase-service-role'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'

export async function PATCH(request: NextRequest) {
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
  const db = admin ?? supabase

  let body: { station_name?: string; incident_name?: string | null; incident_zone?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data: station, error: stLookupErr } = await db
    .from('stations')
    .select('id')
    .eq('created_by', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (stLookupErr) {
    return NextResponse.json({ error: stLookupErr.message }, { status: 500 })
  }

  if (!station?.id) {
    return NextResponse.json({ error: 'No station found' }, { status: 404 })
  }

  const patch: Record<string, string | null> = {}
  if (typeof body.station_name === 'string') {
    const s = body.station_name.trim()
    if (!s) return NextResponse.json({ error: 'station_name cannot be empty' }, { status: 400 })
    patch.station_name = s.slice(0, 200)
  }
  if (body.incident_name !== undefined) {
    patch.incident_name =
      typeof body.incident_name === 'string' && body.incident_name.trim()
        ? body.incident_name.trim().slice(0, 500)
        : null
  }
  if (body.incident_zone !== undefined) {
    patch.incident_zone =
      typeof body.incident_zone === 'string' && body.incident_zone.trim()
        ? body.incident_zone.trim().slice(0, 500)
        : null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await db.from('stations').update(patch).eq('id', station.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, station_id: station.id })
}

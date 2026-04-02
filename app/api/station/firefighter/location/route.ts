import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'

const STATUS_VALUES = new Set(['active', 'off_duty', 'unavailable'])

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

  let body: { lat?: number; lng?: number; status?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat)
  const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {
    current_lat: lat,
    current_lng: lng,
    last_seen_at: new Date().toISOString(),
  }

  if (body.status !== undefined && body.status !== null) {
    const s = String(body.status)
    if (!STATUS_VALUES.has(s)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    patch.status = s
  }

  const { data: row, error: selErr } = await supabase
    .from('station_firefighters')
    .select('id')
    .eq('firefighter_id', user.id)
    .limit(1)
    .maybeSingle()

  if (selErr || !row?.id) {
    return NextResponse.json({ error: 'Not a station member' }, { status: 403 })
  }

  const { error } = await supabase.from('station_firefighters').update(patch).eq('firefighter_id', user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

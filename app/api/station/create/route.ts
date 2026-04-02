import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'
import { formatStationInviteCode, randomInviteSuffix } from '@/lib/station-invite-code'

export async function POST(request: NextRequest) {
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

  let body: { station_name?: string; incident_name?: string; incident_zone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const stationName = typeof body.station_name === 'string' ? body.station_name.trim() : ''
  if (!stationName || stationName.length > 200) {
    return NextResponse.json({ error: 'station_name required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('stations')
    .select('id')
    .eq('created_by', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return NextResponse.json(
      { error: 'already_has_station', station_id: existing.id, message: 'Use invite regenerate or update station.' },
      { status: 409 }
    )
  }

  const incidentName =
    typeof body.incident_name === 'string' && body.incident_name.trim() ? body.incident_name.trim().slice(0, 500) : null
  const incidentZone =
    typeof body.incident_zone === 'string' && body.incident_zone.trim() ? body.incident_zone.trim().slice(0, 500) : null

  const { data: station, error: stErr } = await supabase
    .from('stations')
    .insert({
      created_by: user.id,
      station_name: stationName,
      incident_name: incidentName,
      incident_zone: incidentZone,
      is_active: true,
    })
    .select('id')
    .single()

  if (stErr || !station) {
    return NextResponse.json({ error: stErr?.message ?? 'Could not create station' }, { status: 500 })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  let codeRow: { code: string; expires_at: string | null } | null = null
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = formatStationInviteCode(stationName, randomInviteSuffix(6))
    const { data: row, error: cErr } = await supabase
      .from('station_invite_codes')
      .insert({
        station_id: station.id,
        code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_uses: 50,
        uses_count: 0,
        is_active: true,
      })
      .select('code, expires_at')
      .single()

    if (!cErr && row) {
      codeRow = row
      break
    }
  }

  if (!codeRow) {
    await supabase.from('stations').delete().eq('id', station.id)
    return NextResponse.json({ error: 'Could not generate unique invite code' }, { status: 500 })
  }

  return NextResponse.json({
    station_id: station.id,
    code: codeRow.code,
    expires_at: codeRow.expires_at,
  })
}

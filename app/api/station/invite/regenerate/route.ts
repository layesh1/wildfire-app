import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'
import { formatStationInviteCode, randomInviteSuffix } from '@/lib/station-invite-code'

export async function POST() {
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

  const { data: station } = await supabase
    .from('stations')
    .select('id, station_name')
    .eq('created_by', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!station?.id) {
    return NextResponse.json({ error: 'No station found' }, { status: 404 })
  }

  await supabase
    .from('station_invite_codes')
    .update({ is_active: false })
    .eq('station_id', station.id)
    .eq('is_active', true)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  const stationName = typeof station.station_name === 'string' ? station.station_name : 'STATION'

  let codeRow: { code: string; expires_at: string | null } | null = null
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = formatStationInviteCode(stationName, randomInviteSuffix(6))
    const { data: row, error } = await supabase
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

    if (!error && row) {
      codeRow = row
      break
    }
  }

  if (!codeRow) {
    return NextResponse.json({ error: 'Could not generate unique invite code' }, { status: 500 })
  }

  return NextResponse.json({
    station_id: station.id,
    code: codeRow.code,
    expires_at: codeRow.expires_at,
  })
}

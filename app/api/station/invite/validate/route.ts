import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-service-role'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip, 'station-invite-validate', 20, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Server misconfigured', hint: 'SUPABASE_SERVICE_ROLE_KEY required for invite validation.' },
      { status: 503 }
    )
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!raw) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  const { data: row, error } = await admin
    .from('station_invite_codes')
    .select('id, uses_count, max_uses, expires_at, is_active, station_id')
    .eq('code', raw)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const uses = typeof row.uses_count === 'number' ? row.uses_count : 0
  const maxUses = typeof row.max_uses === 'number' ? row.max_uses : 50
  const active = row.is_active !== false
  const exp = row.expires_at ? new Date(row.expires_at as string).getTime() : null
  const expired = exp != null && exp < Date.now()

  if (!active || expired || uses >= maxUses) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: st } = await admin
    .from('stations')
    .select('station_name, incident_name')
    .eq('id', row.station_id as string)
    .maybeSingle()

  return NextResponse.json({
    valid: true,
    station_id: row.station_id as string,
    station_name: typeof st?.station_name === 'string' ? st.station_name : '',
    incident_name: typeof st?.incident_name === 'string' ? st.incident_name : null,
  })
}

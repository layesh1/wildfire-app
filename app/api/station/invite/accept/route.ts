import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase-service-role'

function mergeResponderRoles(
  role: string | null | undefined,
  roles: string[] | null | undefined
): { role: string; roles: string[] } {
  const base = Array.isArray(roles) && roles.length ? [...roles] : role ? [role] : ['evacuee']
  const next = [...new Set([...base, 'emergency_responder'])]
  return { role: 'emergency_responder', roles: next }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Server misconfigured', hint: 'SUPABASE_SERVICE_ROLE_KEY required.' },
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

  const { data: codeRow, error: codeErr } = await admin
    .from('station_invite_codes')
    .select('id, station_id, uses_count, max_uses, expires_at, is_active')
    .eq('code', raw)
    .maybeSingle()

  if (codeErr || !codeRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const uses = typeof codeRow.uses_count === 'number' ? codeRow.uses_count : 0
  const maxUses = typeof codeRow.max_uses === 'number' ? codeRow.max_uses : 50
  const active = codeRow.is_active !== false
  const exp = codeRow.expires_at ? new Date(codeRow.expires_at as string).getTime() : null
  const expired = exp != null && exp < Date.now()

  if (!active || expired || uses >= maxUses) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const stationId = codeRow.station_id as string

  const { data: existingMember } = await admin
    .from('station_firefighters')
    .select('id')
    .eq('station_id', stationId)
    .eq('firefighter_id', user.id)
    .maybeSingle()

  let joinedNew = false
  if (!existingMember) {
    const { error: insErr } = await admin.from('station_firefighters').insert({
      station_id: stationId,
      firefighter_id: user.id,
      status: 'active',
    })

    if (insErr) {
      if (insErr.code === '23505') {
        joinedNew = false
      } else {
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
    } else {
      joinedNew = true
    }
  }

  if (joinedNew) {
    const nextUses = uses + 1
    await admin.from('station_invite_codes').update({ uses_count: nextUses }).eq('id', codeRow.id as string)
  }

  const { data: prof } = await admin
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .maybeSingle()

  const merged = mergeResponderRoles(prof?.role as string | undefined, prof?.roles as string[] | null)
  const { error: upErr } = await admin
    .from('profiles')
    .update({ role: merged.role, roles: merged.roles })
    .eq('id', user.id)

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  const { data: st } = await admin
    .from('stations')
    .select('station_name')
    .eq('id', stationId)
    .maybeSingle()

  return NextResponse.json({
    station_id: stationId,
    station_name: typeof st?.station_name === 'string' ? st.station_name : '',
  })
}

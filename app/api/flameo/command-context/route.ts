import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { assembleFlameoCommandContext } from '@/lib/flameo-command'
import type { FlameoCommandFireContext } from '@/lib/flameo-command-types'
import { distanceMiles } from '@/lib/hub-map-distance'
import {
  fetchResponderHouseholdPins,
  isEmergencyResponder,
} from '@/lib/responder-evacuees-server'

async function fireContextForPoint(
  origin: string,
  lat: number,
  lng: number
): Promise<FlameoCommandFireContext> {
  const loc = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const weatherUrl = `${origin}/api/weather?location=${encodeURIComponent(loc)}`
  const [wRes, nifcRes] = await Promise.all([
    fetch(weatherUrl, { next: { revalidate: 120 } }),
    fetch(`${origin}/api/fires/nifc`, { next: { revalidate: 300 } }),
  ])

  let wind_dir: string | null = null
  let wind_mph: number | null = null
  let fire_risk = 'Unknown'
  if (wRes.ok) {
    const w = (await wRes.json()) as Record<string, unknown>
    wind_dir = typeof w.wind_dir === 'string' ? w.wind_dir : null
    wind_mph = typeof w.wind_mph === 'number' ? w.wind_mph : null
    fire_risk = typeof w.fire_risk === 'string' ? w.fire_risk : 'Unknown'
  }

  let nearest_fire_miles: number | null = null
  if (nifcRes.ok) {
    const j = (await nifcRes.json()) as { data?: Array<{ latitude?: number; longitude?: number }> }
    const data = Array.isArray(j.data) ? j.data : []
    let best: number | null = null
    for (const f of data) {
      if (typeof f.latitude !== 'number' || typeof f.longitude !== 'number') continue
      const d = distanceMiles([lat, lng], [f.latitude, f.longitude])
      if (best == null || d < best) best = d
    }
    nearest_fire_miles = best
  }

  return { nearest_fire_miles, wind_dir, wind_mph, fire_risk }
}

function parseCoord(q: string | null): number | null {
  if (q == null || !q.trim()) return null
  const n = Number(q)
  return Number.isFinite(n) ? n : null
}

/**
 * GET — emergency_responder only. COMMAND zone summary + priority queue + fire/weather context.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .maybeSingle()

  if (meErr || !isEmergencyResponder(me?.role, me?.roles as string[] | null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { householdPins, error } = await fetchResponderHouseholdPins(supabase)
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  const sp = request.nextUrl.searchParams
  let refLat = parseCoord(sp.get('lat'))
  let refLng = parseCoord(sp.get('lng'))
  if (refLat == null || refLng == null) {
    if (householdPins.length > 0) {
      refLat = householdPins.reduce((s, p) => s + p.lat, 0) / householdPins.length
      refLng = householdPins.reduce((s, p) => s + p.lng, 0) / householdPins.length
    } else {
      refLat = 35.4088
      refLng = -80.5795
    }
  }

  const origin = request.nextUrl.origin
  const fire_context = await fireContextForPoint(origin, refLat, refLng)
  const ctx = assembleFlameoCommandContext(householdPins, fire_context)
  return NextResponse.json(ctx)
}

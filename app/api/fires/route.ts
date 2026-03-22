import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Cap limit to prevent expensive queries
  const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 100)
  const state = searchParams.get('state')
  const hasOrder = searchParams.get('has_order')

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('fire_events')
    .select(`
      id, geo_event_id, incident_name,
      latitude, longitude, county, state,
      acres_burned, containment_pct, started_at,
      svi_score, has_evacuation_order, signal_gap_hours
    `)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (state) query = query.eq('state', state)
  if (hasOrder === 'true') query = query.eq('has_evacuation_order', true)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  return NextResponse.json({ data, count: data?.length })
}

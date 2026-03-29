import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { HOME_EVACUATION_STATUS_VALUES, type HomeEvacuationStatus } from '@/lib/checkin-status'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const status = body?.status as string
    const location_name = typeof body?.location_name === 'string' ? body.location_name.slice(0, 500) : null
    const mode = body?.mode === 'monitored' ? 'monitored' : 'self'
    const monitoredPersonId = typeof body?.monitored_person_id === 'string' ? body.monitored_person_id.slice(0, 80) : null

    if (!HOME_EVACUATION_STATUS_VALUES.includes(status as HomeEvacuationStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (mode === 'monitored') {
      if (!monitoredPersonId) {
        return NextResponse.json({ error: 'monitored_person_id required' }, { status: 400 })
      }
      const { error } = await supabase.from('monitored_person_checkins').upsert(
        {
          caregiver_user_id: user.id,
          monitored_person_id: monitoredPersonId,
          status,
          location_name: location_name || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'caregiver_user_id,monitored_person_id' }
      )
      if (error) {
        console.error('[evacuee-records/dashboard]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, mode: 'monitored' })
    }

    const { error } = await supabase.from('evacuee_records').upsert(
      {
        user_id: user.id,
        status,
        location_name: location_name || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (error) {
      console.error('[evacuee-records/dashboard] evacuee_records', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mode: 'self' })
  } catch (e) {
    console.error('[evacuee-records/dashboard]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

// Optional Supabase — only imported if env vars are present
async function trySupabaseUpsert(token: string, status: string, confirmed_at: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key)
    await supabase
      .from('checkin_events')
      .upsert({ token, status, confirmed_at }, { onConflict: 'token' })
  } catch {
    // Supabase unavailable or table doesn't exist — BroadcastChannel handles real-time
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, status, confirmed_at } = body as {
      token: string
      status: string
      confirmed_at?: string
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }
    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const ts = confirmed_at ?? new Date().toISOString()

    // Fire-and-forget Supabase write — don't await so response is fast
    trySupabaseUpsert(token, status, ts).catch(() => {})

    return NextResponse.json({ success: true, status, confirmed_at: ts })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

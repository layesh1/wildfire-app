import { NextResponse, NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

const VALID_STATUSES = new Set(['evacuated', 'sheltering', 'returning', 'unknown'])
// Simple UUID-ish format check (prevents injection of arbitrary strings)
const TOKEN_RE = /^[a-zA-Z0-9_-]{8,128}$/

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

export async function POST(request: NextRequest) {
  // Rate limit: 10 check-ins per minute per IP
  const ip = getClientIp(request)
  if (!checkRateLimit(ip, 'checkin', 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { token, status, confirmed_at } = body as {
      token: string
      status: string
      confirmed_at?: string
    }

    if (!token || typeof token !== 'string' || !TOKEN_RE.test(token)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const ts = confirmed_at ?? new Date().toISOString()

    // Fire-and-forget Supabase write — don't await so response is fast
    trySupabaseUpsert(token, status, ts).catch(() => {})

    return NextResponse.json({ success: true, status, confirmed_at: ts })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

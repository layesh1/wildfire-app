import { NextRequest, NextResponse } from 'next/server'

/**
 * Honeypot endpoint — catches scanners probing for admin panels, .env files, etc.
 * Link to this from a hidden <a> tag in your layout so crawlers find it.
 * Real users never call it; any hit = likely a bot or attacker.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  const path = req.nextUrl.pathname

  // Log to console — Vercel captures these in its log dashboard
  console.warn('[HONEYPOT HIT]', JSON.stringify({ ip, ua, path, ts: new Date().toISOString() }))

  // Optionally log to Supabase for persistent threat tracking
  // const supabase = createClient(...)
  // await supabase.from('security_events').insert({ type: 'honeypot', ip, ua, path })

  // Return a convincing decoy response (looks like a real 404, not an obvious trap)
  return new NextResponse('Not Found', { status: 404 })
}

export async function POST(req: NextRequest) {
  return GET(req)
}

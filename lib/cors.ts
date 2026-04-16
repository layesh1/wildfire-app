import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://wildfire-app-three.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[]

export function getAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin')
  if (!origin) return null

  // Always allow same-origin requests — browser sends Origin even for same-origin
  // POST/fetch, so this covers every Vercel deployment URL automatically.
  try {
    const serverOrigin = `${req.nextUrl.protocol}//${req.nextUrl.host}`
    if (origin === serverOrigin) return origin
  } catch {}

  // Allow explicit origins and Vercel preview deployments for this project
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  if (/^https:\/\/wildfire-app[a-z0-9-]*\.vercel\.app$/.test(origin)) return origin
  return null
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = getAllowedOrigin(req)
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

/** Call this at the top of every API route handler to reject foreign origins */
export function enforceCors(req: NextRequest): NextResponse | null {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) })
  }

  // Same-origin requests have no Origin header — always allow
  const origin = req.headers.get('origin')
  if (!origin) return null

  if (!getAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null // allowed — continue
}

/** Attach CORS headers to an existing response */
export function withCors(res: NextResponse, req: NextRequest): NextResponse {
  const headers = corsHeaders(req)
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v)
  return res
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getAllowedOrigin, corsHeaders } from '@/lib/cors'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── CORS for API routes ────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Handle preflight without touching Supabase
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
    }

    // Reject requests from unrecognised cross-origins
    const origin = request.headers.get('origin')
    if (origin && !getAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Pass through with CORS headers attached
    const res = NextResponse.next({ request })
    const headers = corsHeaders(request)
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v)
    return res
  }

  // ── Supabase auth session refresh + route guards ───────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = pathname.startsWith('/auth')
  const isDashboard = pathname.startsWith('/dashboard')

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/api/:path*'],
}

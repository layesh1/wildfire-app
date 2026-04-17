import { createBrowserClient } from '@supabase/ssr'

function getBrowserSupabaseEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  return { url, anonKey }
}

/**
 * Browser Supabase client. Requires both URL and anon key at build/runtime;
 * otherwise PostgREST returns 400 `No API key found in request`.
 */
export function createClient() {
  const { url, anonKey } = getBrowserSupabaseEnv()
  if (!url || !anonKey) {
    const msg =
      'Supabase client misconfigured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (dev) or Vercel Environment Variables (production).'
    console.error('[supabase]', msg)
    throw new Error(msg)
  }
  return createBrowserClient(url, anonKey)
}

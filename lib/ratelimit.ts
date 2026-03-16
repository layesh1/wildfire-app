/**
 * Simple in-memory rate limiter — no Redis required.
 * Works per-serverless-instance (good enough for Vercel; upgrade to Upstash if you need
 * cross-instance limits at high traffic).
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (entry.count >= limit) return false // blocked

  entry.count++
  return true // allowed
}

// Clean up old entries every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

export function checkRateLimit(
  ip: string,
  namespace: string,
  limit: number,
  windowMs: number
): boolean {
  return check(`${namespace}:${ip}`, limit, windowMs)
}

export function getClientIp(req: Request): string {
  return (
    (req.headers as Headers).get('x-forwarded-for')?.split(',')[0].trim() ||
    (req.headers as Headers).get('x-real-ip') ||
    'anonymous'
  )
}

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Only instantiate when env vars are present (skips in local dev without Redis)
function makeRatelimit(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
  })
}

// 10 invite verifications per IP per minute
export const inviteRateLimit = makeRatelimit(10, '1 m')

// 20 AI messages per IP per minute, 100 per hour
export const aiRateLimit = makeRatelimit(20, '1 m')

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous'
  )
}

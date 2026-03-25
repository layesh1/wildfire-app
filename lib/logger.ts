/**
 * Structured server-side logger.
 * Output is JSON in production (readable in Vercel logs) and pretty-printed in dev.
 */

type Level = 'info' | 'warn' | 'error'

interface LogEntry {
  ts: string
  level: Level
  route?: string
  method?: string
  status?: number
  durationMs?: number
  userId?: string   // anonymised — only first 8 chars logged
  msg: string
  [key: string]: unknown
}

function write(level: Level, msg: string, meta: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  }

  // Anonymise user ID to first 8 chars (enough for correlation, not identification)
  if (typeof entry.userId === 'string' && entry.userId.length > 8) {
    entry.userId = entry.userId.slice(0, 8) + '…'
  }

  if (process.env.NODE_ENV === 'production') {
    // Vercel captures stdout as structured logs
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(JSON.stringify(entry))
  } else {
    const colour = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m'
    const reset = '\x1b[0m'
    const parts = [`${colour}[${level.toUpperCase()}]${reset}`, msg]
    const extras = Object.entries(meta)
      .filter(([k]) => !['msg'].includes(k))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    if (extras.length) parts.push(`(${extras.join(' ')})`)
    console.log(parts.join(' '))
  }
}

export const logger = {
  info:  (msg: string, meta?: Record<string, unknown>) => write('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => write('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
}

/**
 * Wraps an API route handler with automatic request/response logging and timing.
 *
 * Usage:
 *   export const POST = withLogging('route-name', async (req) => { ... })
 */
export function withLogging<T extends Request>(
  routeName: string,
  handler: (req: T) => Promise<Response>
): (req: T) => Promise<Response> {
  return async (req: T) => {
    const start = Date.now()
    let status = 500
    try {
      const res = await handler(req)
      status = res.status
      logger.info('api', {
        route: routeName,
        method: req.method,
        status,
        durationMs: Date.now() - start,
      })
      return res
    } catch (err) {
      logger.error('api unhandled', {
        route: routeName,
        method: req.method,
        status,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }
}

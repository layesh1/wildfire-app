/** Lightweight input validation helpers for API routes */

export class ValidationError extends Error {
  status = 400
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/** Validate a string field */
export function validateString(
  value: unknown,
  field: string,
  { maxLength = 500, minLength = 0, allowedValues, pattern }: {
    maxLength?: number
    minLength?: number
    allowedValues?: string[]
    pattern?: RegExp
  } = {}
): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`)
  const v = value.trim()
  if (v.length < minLength) throw new ValidationError(`${field} is required`)
  if (v.length > maxLength) throw new ValidationError(`${field} exceeds maximum length of ${maxLength}`)
  if (allowedValues && !allowedValues.includes(v)) {
    throw new ValidationError(`${field} must be one of: ${allowedValues.join(', ')}`)
  }
  if (pattern && !pattern.test(v)) throw new ValidationError(`${field} has an invalid format`)
  return v
}

/** Validate an optional string — returns undefined if absent/null */
export function validateOptionalString(
  value: unknown,
  field: string,
  opts: { maxLength?: number } = {}
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return validateString(value, field, opts)
}

/** Validate an array */
export function validateArray(
  value: unknown,
  field: string,
  { maxItems = 100 }: { maxItems?: number } = {}
): unknown[] {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`)
  if (value.length > maxItems) throw new ValidationError(`${field} exceeds maximum of ${maxItems} items`)
  return value
}

/** Validate a Claude messages array — each item must be {role, content} */
export function validateMessages(value: unknown): { role: 'user' | 'assistant'; content: string }[] {
  const arr = validateArray(value, 'messages', { maxItems: 40 })
  return arr.map((item, i) => {
    if (typeof item !== 'object' || item === null) {
      throw new ValidationError(`messages[${i}] must be an object`)
    }
    const m = item as Record<string, unknown>
    const role = validateString(m.role, `messages[${i}].role`, {
      allowedValues: ['user', 'assistant'],
    })
    const content = validateString(m.content, `messages[${i}].content`, {
      maxLength: 4000,
      minLength: 1,
    })
    return { role: role as 'user' | 'assistant', content }
  })
}

/** Validate a push subscription object */
export function validatePushSubscription(value: unknown): {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
} {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationError('subscription must be an object')
  }
  const s = value as Record<string, unknown>
  const endpoint = validateString(s.endpoint, 'endpoint', {
    maxLength: 500,
    pattern: /^https:\/\//,
  })
  return { endpoint, keys: s.keys as { p256dh?: string; auth?: string } | undefined }
}

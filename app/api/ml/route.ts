import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { ValidationError } from '@/lib/validate'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL

const FEATURE_BOUNDS: Record<string, [number, number]> = {
  wind_speed: [0, 200],
  humidity: [0, 100],
  temperature: [-60, 150],
  slope: [0, 90],
  vegetation_density: [0, 1],
}

function validateFeatures(raw: unknown): Record<string, number> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError('features must be an object')
  }
  const f = raw as Record<string, unknown>
  const out: Record<string, number> = {}
  for (const [key, [min, max]] of Object.entries(FEATURE_BOUNDS)) {
    if (key in f) {
      const v = Number(f[key])
      if (!isFinite(v)) throw new ValidationError(`features.${key} must be a number`)
      if (v < min || v > max) throw new ValidationError(`features.${key} must be between ${min} and ${max}`)
      out[key] = v
    }
  }
  return out
}

function ruleBasedPrediction(features: Record<string, number>) {
  const { wind_speed = 10, humidity = 30, temperature = 85, slope = 5, vegetation_density = 0.5 } = features

  const riskScore =
    (wind_speed / 60) * 0.35 +
    ((100 - humidity) / 100) * 0.30 +
    (temperature / 120) * 0.20 +
    (slope / 45) * 0.10 +
    vegetation_density * 0.05

  let spread_risk: string
  let predicted_acres_24h: number

  if (riskScore > 0.75) { spread_risk = 'extreme'; predicted_acres_24h = wind_speed * 150 }
  else if (riskScore > 0.55) { spread_risk = 'high'; predicted_acres_24h = wind_speed * 80 }
  else if (riskScore > 0.35) { spread_risk = 'moderate'; predicted_acres_24h = wind_speed * 30 }
  else { spread_risk = 'low'; predicted_acres_24h = wind_speed * 10 }

  return {
    spread_risk,
    predicted_acres_24h: Math.round(predicted_acres_24h),
    confidence: 0.62,
    model: 'rule_based_fallback',
    features_used: Object.keys(FEATURE_BOUNDS),
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip, 'ml', 15, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
    }

    const features = validateFeatures(body.features)
    // fire_id is optional metadata — validate if present
    const fire_id = typeof body.fire_id === 'string'
      ? body.fire_id.slice(0, 100)
      : undefined

    if (ML_SERVICE_URL) {
      try {
        const res = await fetch(`${ML_SERVICE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fire_id, features }),
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) return NextResponse.json(await res.json())
      } catch {
        // Fall through to rule-based
      }
    }

    return NextResponse.json({ fire_id, ...ruleBasedPrediction(features) })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

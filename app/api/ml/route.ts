import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

// This route proxies to your Python ML service (Modal or Render)
// Falls back to rule-based estimates if ML service unavailable

const ML_SERVICE_URL = process.env.ML_SERVICE_URL // e.g. https://your-app.modal.run

function ruleBasedPrediction(features: any) {
  const { wind_speed = 10, humidity = 30, temperature = 85, slope = 5, vegetation_density = 0.5 } = features
  
  // Simple heuristic score
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
    features_used: ['wind_speed', 'humidity', 'temperature', 'slope', 'vegetation_density'],
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip, 'ml', 15, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { fire_id, features } = body

    if (!features) {
      return NextResponse.json({ error: 'features object required' }, { status: 400 })
    }

    // Try ML service first
    if (ML_SERVICE_URL) {
      try {
        const res = await fetch(`${ML_SERVICE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fire_id, features }),
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data)
        }
      } catch {
        // Fall through to rule-based
      }
    }

    // Fallback
    const prediction = ruleBasedPrediction(features)
    return NextResponse.json({ fire_id, ...prediction })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

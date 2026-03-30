import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { isAlertsAiDeploymentEnabled } from '@/lib/alerts-ai-feature'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

type IncidentInput = {
  id: string
  name: string
  distanceKm: number
  containment: number | null
  acres: number | null
}

/**
 * Bounded AI: interprets pre-fetched incidents only; returns JSON for My Alerts.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkRateLimit(ip, 'alerts-ai', 8, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  if (!isAlertsAiDeploymentEnabled()) {
    return NextResponse.json({ error: 'AI alerts are disabled for this deployment' }, { status: 403 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('alerts_ai_enabled')
      .eq('id', user.id)
      .single()
    if (prof?.alerts_ai_enabled !== true) {
      return NextResponse.json({ error: 'AI summaries disabled' }, { status: 403 })
    }

    const body = await request.json()
    const incidents = Array.isArray(body?.incidents) ? body.incidents as IncidentInput[] : []
    const anchorLabel = typeof body?.anchorLabel === 'string' ? body.anchorLabel.slice(0, 120) : 'Your location'

    if (incidents.length === 0) {
      return NextResponse.json({ error: 'No incidents' }, { status: 400 })
    }
    if (incidents.length > 12) {
      return NextResponse.json({ error: 'Too many incidents' }, { status: 400 })
    }

    const payload = JSON.stringify(
      incidents.map(i => ({
        id: i.id,
        name: i.name,
        distanceKm: i.distanceKm,
        containment: i.containment,
        acres: i.acres,
      }))
    )

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a wildfire safety assistant. The user anchor is: "${anchorLabel}".
Here are ONLY verified nearby fire records (JSON). Do NOT invent fires or distances.

${payload}

Respond with a single JSON object only, no markdown:
{
  "headline": "short title",
  "severity": "critical"|"high"|"elevated"|"watch",
  "bullets": ["string", "string"],
  "recommended_actions": ["string"]
}
Rules: Every bullet must be justified by the input ids. If data is uncertain, say so.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid model output' }, { status: 502 })
    }
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const headline = String(parsed.headline ?? '')
    const severity = String(parsed.severity ?? 'watch')
    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.map(String) : []
    const recommended_actions = Array.isArray(parsed.recommended_actions)
      ? parsed.recommended_actions.map(String)
      : []

    const out = { headline, severity, bullets, recommended_actions }

    try {
      await supabase.from('user_alert_items').insert({
        user_id: user.id,
        type: 'early_fire_ai',
        severity,
        title: headline.slice(0, 500),
        body: JSON.stringify({ bullets, recommended_actions }),
        metadata: {
          incident_ids: incidents.map(i => i.id),
          anchorLabel,
        },
      })
    } catch (persistErr) {
      console.warn('[alerts/ai-summarize] user_alert_items insert skipped', persistErr)
    }

    return NextResponse.json(out)
  } catch (e) {
    console.error('[alerts/ai-summarize]', e)
    return NextResponse.json({ error: 'Summarize failed' }, { status: 500 })
  }
}

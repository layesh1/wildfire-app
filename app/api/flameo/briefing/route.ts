import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { logger } from '@/lib/logger'
import type { FlameoBriefingApiResponse, FlameoContext, FlameoContextStatus } from '@/lib/flameo-context-types'
import {
  briefingForNonReadyStatus,
  templatedLlmFailureBriefing,
  templatedReadyWithoutLlm,
} from '@/lib/flameo-briefing'
import { stripMarkdownHeadingMarkers } from '@/lib/flameo-briefing-format'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const SYSTEM_BRIEFING = `You are Flameo, a wildfire safety assistant. You receive verified fire data tied to one or more reference points:
- anchor id "home" is the user's saved street address (geocoded).
- anchor id "work" (when present) is their saved work/s secondary address; context.location_anchor may include building_type, floor_number, and location_note when they are detected at work.
- anchor id "live" (when present) is their current GPS position from the device; context.flags.live_differs_from_home is true when both are included.
- anchor id "unknown" means proximity was computed from GPS alone when the client could not match home vs work.
Incidents list distance_miles_from_home, distance_miles_from_live, and nearest_anchor_id so you can distinguish threats near their household vs near where they are right now.
Shelters listed are human emergency evacuation shelters only. Do not recommend animal shelters or veterinary facilities as evacuation destinations.

When context.location_anchor.anchor is "work" and the building is an office or apartment, prioritize stairwell evacuation (never elevators). If mobility notes suggest a wheelchair or mobility device, mention asking building security for stair-assisted evacuation help.

Based ONLY on this data, generate a concise proactive briefing (3-5 sentences max). When both anchors exist, briefly acknowledge home vs current location when relevant to the incidents. Do not invent fire names, distances, or locations not in the data. If data is insufficient, say so explicitly.

Output plain sentences only: do not use markdown (no ** asterisks, no # headings, no hashtags). Do not add regional or city marketing labels unless the same wording appears verbatim in the JSON (e.g. an incident or shelter name). Prefer neutral phrasing such as "near your saved home" or "relative to your location" instead of naming a metro area.`

function finalizeBriefing(s: string): string {
  return stripMarkdownHeadingMarkers(s.trim())
}

function isFlameoContext(x: unknown): x is FlameoContext {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const flags = o.flags as Record<string, unknown> | undefined
  return (
    typeof o.role === 'string'
    && Array.isArray(o.anchors)
    && Array.isArray(o.incidents_nearby)
    && typeof o.alert_radius_miles === 'number'
    && flags != null
    && typeof flags.has_confirmed_threat === 'boolean'
    && typeof flags.no_data === 'boolean'
  )
}

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateKey = user.id ?? getClientIp(request)
    if (!checkRateLimit(rateKey, 'flameo-briefing:min', 8, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    if (!checkRateLimit(rateKey, 'flameo-briefing:hour', 40, 60 * 60_000)) {
      return NextResponse.json({ error: 'Hourly limit reached' }, { status: 429 })
    }

    const body = await request.json()
    const status = body?.status as FlameoContextStatus | undefined
    const context = body?.context as FlameoContext | undefined
    const message = typeof body?.message === 'string' ? body.message : undefined

    if (!status || !isFlameoContext(context)) {
      return NextResponse.json({ error: 'Invalid body: require { status, context }' }, { status: 400 })
    }

    if (status !== 'ready') {
      const briefing = briefingForNonReadyStatus(status, message)
      const res: FlameoBriefingApiResponse = {
        briefing: finalizeBriefing(briefing || 'Fire safety information is limited right now.'),
        grounded: true,
        fallback: false,
      }
      return NextResponse.json(res)
    }

    // status === 'ready'
    if (!context.flags?.has_confirmed_threat || context.incidents_nearby.length === 0) {
      const res: FlameoBriefingApiResponse = {
        briefing: finalizeBriefing(
          message ??
            'No confirmed incidents to brief within your alert radius. Check back after the next data refresh.'
        ),
        grounded: true,
        fallback: false,
      }
      return NextResponse.json(res)
    }

    if (!client || !process.env.ANTHROPIC_API_KEY) {
      const res: FlameoBriefingApiResponse = {
        briefing: finalizeBriefing(templatedReadyWithoutLlm(context)),
        grounded: true,
        fallback: true,
      }
      return NextResponse.json(res)
    }

    const payload = {
      role: context.role,
      alert_radius_miles: context.alert_radius_miles,
      anchors: context.anchors,
      incidents_nearby: context.incidents_nearby,
      shelters_nearby: context.shelters_nearby ?? [],
      weather_summary: context.weather_summary,
      flags: context.flags,
    }

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: SYSTEM_BRIEFING,
        messages: [
          {
            role: 'user',
            content: `Verified context (JSON). Use ONLY these incident ids and distances — do not invent any:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      })
      const text =
        response.content[0].type === 'text' ? response.content[0].text.trim() : ''
      if (!text) {
        throw new Error('empty completion')
      }
      logger.info('flameo briefing ok', { route: 'flameo/briefing', durationMs: Date.now() - start, userId: user.id })
      const res: FlameoBriefingApiResponse = {
        briefing: finalizeBriefing(text),
        grounded: true,
        fallback: false,
      }
      return NextResponse.json(res)
    } catch (err) {
      logger.warn('flameo briefing llm failed', {
        route: 'flameo/briefing',
        error: err instanceof Error ? err.message : String(err),
        userId: user.id,
      })
      const res: FlameoBriefingApiResponse = {
        briefing: finalizeBriefing(templatedLlmFailureBriefing(context)),
        grounded: true,
        fallback: true,
      }
      return NextResponse.json(res)
    }
  } catch (err: unknown) {
    logger.error('flameo briefing route error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

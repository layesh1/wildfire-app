import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { logger } from '@/lib/logger'
import { stripMarkdownHeadingMarkers } from '@/lib/flameo-briefing-format'
import type { FlameoCommandContext } from '@/lib/flameo-command-types'
import {
  commandBriefingFallback,
  FLAMEO_COMMAND_PRIORITY_SECTION_DELIMITER,
} from '@/lib/flameo-command'
import { isEmergencyResponder } from '@/lib/responder-evacuees-server'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const SYSTEM_COMMAND = `You are Flameo COMMAND, an AI field intelligence assistant for emergency responders.

You have verified evacuation data for your incident zone. Your job is to give responders a clear, actionable situation briefing.

RULES:
- Only reference data provided in command context (households are already limited to the operational zone and fire-threat proximity — do not mention addresses outside this JSON)
- The UI shows a red Alert strip for nearest fire, wind, and cannot-evacuate counts — still start your written briefing with one short sentence on active fire / weather threat (for radio read-back), then move to people and routing
- Give specific addresses and action types from priority_assignments only
- Lead with the most critical cases after the fire line
- Be concise — responders are in the field
- Never speculate about fire behavior beyond provided wind/distance data
- If someone needs EMS, say so explicitly
- If an area is clear, say so — don't waste resources
- You can flag that someone needs EMS due to medical equipment. You cannot give medical advice or suggest medical treatments.
- FIELD UNITS: If field_units_reporting has entries, use priority_assignments[].assigned_to and estimated_travel_minutes to state who should go where first (e.g. "Send [name] to [address] for [EMS/CHECK/etc]."). If field_units_without_position_count > 0, note that some roster members are not sharing location. If field_units_reporting is empty and the roster may still exist, recommend radio or app check-in for positions — do not invent unit locations.

FORMAT your response as:
1. Active fires / weather (1 sentence) — distance, wind, risk from fire_context
2. Situation summary (1–2 sentences) — counts from incident_summary only
Then output a single line containing exactly this text (nothing else on that line):
${FLAMEO_COMMAND_PRIORITY_SECTION_DELIMITER}
3. Priority assignments (numbered list) — include suggested unit / routing when assigned_to is present
4. Field disposition when relevant
5. Resources note if relevant

Output plain sentences only: do not use markdown (no ** asterisks, no # headings).`

function finalizeBriefing(s: string): string {
  return stripMarkdownHeadingMarkers(s.trim())
}

function isCommandContext(x: unknown): x is FlameoCommandContext {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const sum = o.incident_summary as Record<string, unknown> | undefined
  const fire = o.fire_context as Record<string, unknown> | undefined
  return (
    sum != null
    && typeof sum.total_households === 'number'
    && typeof sum.total_people === 'number'
    && Array.isArray(o.priority_assignments)
    && fire != null
    && typeof fire.fire_risk === 'string'
    && typeof o.generated_at === 'string'
    && Array.isArray(o.field_units_reporting)
    && typeof o.field_units_without_position_count === 'number'
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
    if (!checkRateLimit(rateKey, 'flameo-command-briefing:min', 8, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    if (!checkRateLimit(rateKey, 'flameo-command-briefing:hour', 40, 60 * 60_000)) {
      return NextResponse.json({ error: 'Hourly limit reached' }, { status: 429 })
    }

    const { data: me, error: meErr } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .maybeSingle()

    if (meErr || !isEmergencyResponder(me?.role, me?.roles as string[] | null)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const commandContext = (body as { commandContext?: unknown })?.commandContext
    if (!isCommandContext(commandContext)) {
      return NextResponse.json({ error: 'Invalid body: require { commandContext }' }, { status: 400 })
    }

    if (!client || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        briefing: finalizeBriefing(commandBriefingFallback(commandContext)),
        fallback: true,
      })
    }

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: SYSTEM_COMMAND,
        messages: [
          {
            role: 'user',
            content: `Command context (JSON). Use ONLY this data:\n${JSON.stringify(commandContext, null, 2)}`,
          },
        ],
      })
      const text =
        response.content[0].type === 'text' ? response.content[0].text.trim() : ''
      if (!text) throw new Error('empty completion')
      logger.info('flameo command briefing ok', {
        route: 'flameo/command-briefing',
        durationMs: Date.now() - start,
        userId: user.id,
      })
      return NextResponse.json({ briefing: finalizeBriefing(text), fallback: false })
    } catch (err) {
      logger.warn('flameo command briefing llm failed', {
        route: 'flameo/command-briefing',
        error: err instanceof Error ? err.message : String(err),
        userId: user.id,
      })
      return NextResponse.json({
        briefing: finalizeBriefing(commandBriefingFallback(commandContext)),
        fallback: true,
      })
    }
  } catch (err: unknown) {
    logger.error('flameo command briefing route error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

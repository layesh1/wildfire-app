import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateMessages, validateString, ValidationError } from '@/lib/validate'
import { logger } from '@/lib/logger'
import {
  FLAMEO_TOOLS,
  COMMAND_INTEL_TOOLS,
  FLAMEO_TOOLS_SYSTEM_SUFFIX,
  COMMAND_INTEL_TOOLS_SYSTEM_SUFFIX,
  extractTextAndToolActionsFromAnthropicContent,
} from '@/lib/flameo-phase-c-tools'
import {
  buildFlameoGroundingPrefix,
  FLAMEO_RESPONDER_SYSTEM,
  parseOptionalFlameoContext,
  parseFlameoNavContext,
  resolveFlameoAiRole,
} from '@/lib/flameo-ai-prompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FLAMEO_CONSUMER_SYSTEM = `You are Flameo, a calm, compassionate wildfire safety assistant for the WildfireAlert app.
Your name is Flameo. You help caregivers, evacuees, and people with access and functional needs during wildfire emergencies.
Your tone is warm, clear, and reassuring — like a knowledgeable friend, not a government agency. Use plain language, no jargon.
Key facts you know:
- High-SVI (socially vulnerable) counties are significantly less likely to receive a formal evacuation order at all — SVI predicts whether orders happen, not how long they take
- 99.3% of true wildfires with external signals never received a formal evacuation order (prescribed burns excluded)
- Only 1.3% of wildfires (653 of 50,664) ever receive a formal evacuation order
- Median time from fire start to evacuation order: 1.1 hours (when orders ARE issued)
- 17.7% of fire records are prescribed burns — not every fire alert is an emergency threat
- When external signals exist, responders have a ~4 hour window (median) before an order is issued
- Informal signals (social media, smoke, news) often come before official orders — do not wait for an official order to prepare
- Always prioritize safety over property
- Provide step-by-step guidance when asked about evacuation
- Help users think about dependents, pets, medications, mobility needs in their evacuation plan
- Fire containment % tells you how controlled a fire is — under 25% means it's actively spreading
Always end responses with a warm, brief closing line. Keep responses concise and actionable.

IMPORTANT - TOPIC BOUNDARIES: You ONLY answer questions about wildfires, evacuation, fire safety, emergency preparedness, go-bags, evacuation routes, shelter locations, fire risk, and related emergency topics. If someone asks about anything unrelated (cooking, coding, homework, general knowledge, etc.), politely decline and say: "I'm only able to help with wildfire safety and evacuation questions. For other needs, please use a general assistant. If you have an emergency, call 911 or your local evacuation hotline."`

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const rateLimitKey = user?.id ?? getClientIp(request)

    if (!checkRateLimit(rateLimitKey, 'ai:min', 10, 60_000)) {
      logger.warn('rate limit hit (per-minute)', { route: 'ai', userId: user?.id })
      return NextResponse.json(
        { error: 'You\'re sending messages too quickly. Please wait a moment.' },
        { status: 429 }
      )
    }
    if (!checkRateLimit(rateLimitKey, 'ai:hour', 30, 60 * 60_000)) {
      logger.warn('rate limit hit (per-hour)', { route: 'ai', userId: user?.id })
      return NextResponse.json(
        { error: 'You\'ve reached the hourly message limit. Check back in a bit.' },
        { status: 429 }
      )
    }

    const body = await request.json() as Record<string, unknown>
    const messages = validateMessages(body.messages)
    const legacyPersona = validateString(
      typeof body.persona === 'string' ? body.persona : 'FLAMEO',
      'persona',
      { allowedValues: ['FLAMEO', 'COMMAND-INTEL'] }
    )
    const flameoRole = resolveFlameoAiRole(body, legacyPersona)
    const flameoContext = parseOptionalFlameoContext(body.flameoContext)

    const anthropicMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const isResponder = flameoRole === 'responder'
    const tools = isResponder ? [...COMMAND_INTEL_TOOLS] : [...FLAMEO_TOOLS]
    const useTools = true

    let system = isResponder
      ? FLAMEO_RESPONDER_SYSTEM + COMMAND_INTEL_TOOLS_SYSTEM_SUFFIX
      : FLAMEO_CONSUMER_SYSTEM + FLAMEO_TOOLS_SYSTEM_SUFFIX

    if (!isResponder) {
      const { consumer, navBase } = parseFlameoNavContext(body)
      system += `\n\nNAVIGATION CONTEXT (do not repeat to user as raw JSON): consumer=${consumer}, navBase=${navBase}. Tools open in-app routes for this user only.`
    }

    if (flameoContext) {
      system = `${buildFlameoGroundingPrefix(flameoContext)}\n\n${system}`
    }

    const createParams: Parameters<typeof client.messages.create>[0] = {
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system,
      messages: anthropicMessages,
    }
    if (useTools && tools.length) {
      createParams.tools = tools as Parameters<typeof client.messages.create>[0]['tools']
      createParams.tool_choice = { type: 'auto' }
    }

    const response = (await client.messages.create(createParams)) as Anthropic.Messages.Message

    const rawContent = response.content as { type: string; text?: string; name?: string; input?: unknown }[]
    const { text, actions } = extractTextAndToolActionsFromAnthropicContent(rawContent)

    let content = text
    if (!content && actions.length > 0) {
      content = 'Opening that in the app for you — use the buttons below.'
    }
    if (!content) {
      content = response.content[0]?.type === 'text' ? (response.content[0] as { text: string }).text : ''
    }
    if (!content) content = 'I could not form a reply. Please try again.'

    logger.info('ai response', {
      route: 'ai',
      flameoRole,
      durationMs: Date.now() - start,
      userId: user?.id,
      toolActions: actions.length,
      grounded: Boolean(flameoContext),
    })

    const { consumer, navBase } = parseFlameoNavContext(body)
    return NextResponse.json({
      content,
      persona: 'FLAMEO',
      flameoRole,
      actions: actions.length ? actions : undefined,
      flameoNavContext: !isResponder ? { consumer, navBase } : undefined,
    })
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    logger.error('ai handler failed', { route: 'ai', durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

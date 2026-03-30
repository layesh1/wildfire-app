/**
 * Phase C (ANISHA_flameo-agentic-transformation.md): bounded tool-style actions for Flameo (consumer + responder).
 * Server validates tool inputs; clients build known routes only (no model-supplied URLs).
 */

export type FlameoNavConsumer = 'caregiver' | 'evacuee'
export type FlameoNavBase = 'desktop' | 'mobile'

/** Sanitized DTOs returned from POST /api/ai */
export type FlameoActionDto =
  | { type: 'open_map'; lat?: number; lon?: number; zoom?: number }
  | { type: 'list_shelters' }
  | { type: 'open_checkin' }

export type CommandIntelActionDto =
  | { type: 'open_ics_board' }
  | { type: 'open_command_hub' }
  | { type: 'open_command_analytics' }

export type AiClientAction = FlameoActionDto | CommandIntelActionDto

/** Anthropic Messages API tool definitions */
export const FLAMEO_TOOLS = [
  {
    name: 'open_map',
    description:
      'Open the in-app evacuation map. Use when the user wants to see the map, fires near them, or their area. Optional lat/lon center as decimal degrees (WGS84).',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: 'Latitude, -90 to 90' },
        lon: { type: 'number', description: 'Longitude, -180 to 180' },
        zoom: { type: 'number', description: 'Map zoom level, roughly 4–14' },
      },
    },
  },
  {
    name: 'list_shelters',
    description:
      'Open the evacuation map focused on shelter locations. Use when the user asks where shelters are or how to find evacuation centers.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'open_checkin',
    description:
      'Open Safety Check-In so the user can mark themselves safe or update status. Use when they want to check in, ping family, or report status.',
    input_schema: { type: 'object', properties: {} },
  },
] as const

export const COMMAND_INTEL_TOOLS = [
  {
    name: 'open_ics_board',
    description: 'Open the ICS board for incident command workflows.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'open_command_hub',
    description: 'Open the responder Command Hub dashboard.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'open_command_analytics',
    description: 'Open Command Analytics for incident intelligence views.',
    input_schema: { type: 'object', properties: {} },
  },
] as const

export const FLAMEO_TOOLS_SYSTEM_SUFFIX = `

TOOL USE (Phase C): You have tools open_map, list_shelters, and open_checkin. When the user clearly wants to navigate the app (see the map, find shelters, or check in), call the appropriate tool. You may include a short text message alongside tool calls. Do not invent coordinates — only pass lat/lon if the user or prior context gave specific numbers. If you are only giving general advice, answer in text without tools.`

export const COMMAND_INTEL_TOOLS_SYSTEM_SUFFIX = `

TOOL USE: You have open_ics_board, open_command_hub, and open_command_analytics. Call a tool when the user wants to open that part of the responder dashboard. You may add brief text with the tool call.`

function num(n: unknown): number | undefined {
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined
  return n
}

export function sanitizeFlameoToolUse(name: string, input: unknown): FlameoActionDto | null {
  const o = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  switch (name) {
    case 'open_map': {
      let lat = num(o.lat)
      let lon = num(o.lon)
      let zoom = num(o.zoom)
      if (lat != null && (lat < -90 || lat > 90)) lat = undefined
      if (lon != null && (lon < -180 || lon > 180)) lon = undefined
      if (zoom != null) zoom = Math.min(14, Math.max(4, Math.round(zoom)))
      const out: FlameoActionDto = { type: 'open_map' }
      if (lat != null) out.lat = lat
      if (lon != null) out.lon = lon
      if (zoom != null) out.zoom = zoom
      return out
    }
    case 'list_shelters':
      return { type: 'list_shelters' }
    case 'open_checkin':
      return { type: 'open_checkin' }
    default:
      return null
  }
}

export function sanitizeCommandIntelToolUse(name: string): CommandIntelActionDto | null {
  switch (name) {
    case 'open_ics_board':
      return { type: 'open_ics_board' }
    case 'open_command_hub':
      return { type: 'open_command_hub' }
    case 'open_command_analytics':
      return { type: 'open_command_analytics' }
    default:
      return null
  }
}

type AnthropicContentBlock = { type: string; text?: string; name?: string; input?: unknown }

export function extractTextAndToolActionsFromAnthropicContent(
  content: AnthropicContentBlock[]
): { text: string; actions: AiClientAction[] } {
  const parts: string[] = []
  const actions: AiClientAction[] = []
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    if (block.type === 'tool_use' && typeof block.name === 'string') {
      const f = sanitizeFlameoToolUse(block.name, block.input)
      if (f) {
        actions.push(f)
        continue
      }
      const c = sanitizeCommandIntelToolUse(block.name)
      if (c) actions.push(c)
    }
  }
  return { text: parts.join('\n').trim(), actions }
}

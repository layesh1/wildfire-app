import type { FlameoActionDto, CommandIntelActionDto, FlameoNavConsumer, FlameoNavBase } from '@/lib/flameo-phase-c-tools'

export type FlameoActionChip = { href: string; label: string }

function mapRoot(consumer: FlameoNavConsumer, navBase: FlameoNavBase): string {
  if (navBase === 'mobile') {
    return consumer === 'evacuee' ? '/m/dashboard/evacuee' : '/m/dashboard/caregiver'
  }
  return consumer === 'evacuee' ? '/dashboard/evacuee' : '/dashboard/caregiver'
}

/** Turn server-validated DTOs into in-app links only (bounded). */
export function flameoActionsToChips(
  actions: FlameoActionDto[],
  consumer: FlameoNavConsumer,
  navBase: FlameoNavBase
): FlameoActionChip[] {
  const root = mapRoot(consumer, navBase)
  const chips: FlameoActionChip[] = []
  for (const a of actions) {
    if (a.type === 'open_map') {
      const q = new URLSearchParams()
      if (a.lat != null && a.lon != null) {
        q.set('lat', String(a.lat))
        q.set('lon', String(a.lon))
      }
      if (a.zoom != null) q.set('zoom', String(a.zoom))
      const qs = q.toString()
      chips.push({
        href: `${root}/map${qs ? `?${qs}` : ''}`,
        label: 'Open evacuation map',
      })
    } else if (a.type === 'list_shelters') {
      chips.push({
        href: `${root}/map?shelters=1`,
        label: 'Show shelters on map',
      })
    } else if (a.type === 'open_checkin') {
      chips.push({
        href: `${root}/checkin`,
        label: 'Open check-in',
      })
    }
  }
  return dedupeChips(chips)
}

export function commandIntelActionsToChips(actions: CommandIntelActionDto[]): FlameoActionChip[] {
  const chips: FlameoActionChip[] = []
  for (const a of actions) {
    if (a.type === 'open_ics_board') chips.push({ href: '/dashboard/responder/ics', label: 'Open ICS board' })
    if (a.type === 'open_command_hub') chips.push({ href: '/dashboard/responder', label: 'Command Hub' })
    if (a.type === 'open_command_analytics') chips.push({ href: '/dashboard/responder/analytics', label: 'Command Analytics' })
  }
  return dedupeChips(chips)
}

function dedupeChips(chips: FlameoActionChip[]): FlameoActionChip[] {
  const seen = new Set<string>()
  return chips.filter(c => {
    if (seen.has(c.href)) return false
    seen.add(c.href)
    return true
  })
}

export function partitionAiActions(actions: unknown[]): { flameo: FlameoActionDto[]; intel: CommandIntelActionDto[] } {
  const flameo: FlameoActionDto[] = []
  const intel: CommandIntelActionDto[] = []
  if (!Array.isArray(actions)) return { flameo, intel }
  for (const a of actions) {
    if (!a || typeof a !== 'object') continue
    const t = (a as { type?: string }).type
    if (t === 'open_map' || t === 'list_shelters' || t === 'open_checkin') flameo.push(a as FlameoActionDto)
    if (t === 'open_ics_board' || t === 'open_command_hub' || t === 'open_command_analytics') intel.push(a as CommandIntelActionDto)
  }
  return { flameo, intel }
}

/**
 * Two-status check-in model: home evacuation (responders + family) vs personal safety (family only).
 * Single source of truth for dashboard + mobile.
 */

// ── Home evacuation (responders + family) ──────────────────────────────────

export type HomeEvacuationStatus = 'not_evacuated' | 'evacuated' | 'cannot_evacuate'

export const HOME_EVACUATION_STATUS_VALUES: HomeEvacuationStatus[] = [
  'not_evacuated',
  'evacuated',
  'cannot_evacuate',
]

export type HomeCheckinStatusOption = {
  value: HomeEvacuationStatus
  label: string
  desc?: string
}

/** Options for "My Home Status" — use this array everywhere (maps to profiles.home_evacuation_status). */
export const HOME_CHECKIN_STATUS_OPTIONS: HomeCheckinStatusOption[] = [
  {
    value: 'not_evacuated',
    label: '🏠 Home, not evacuated',
    desc: 'You are still at home and have not left the area.',
  },
  {
    value: 'evacuated',
    label: '🚗 Evacuated — I left',
    desc: 'You have left the hazard area.',
  },
  {
    value: 'cannot_evacuate',
    label: '⚠️ Cannot evacuate — need help',
    desc: 'You cannot leave safely without assistance.',
  },
]

// ── Personal safety (family only) ───────────────────────────────────────────

export type PersonSafetyStatus = 'safe' | 'at_shelter' | 'safe_elsewhere' | 'need_help'

export const PERSON_SAFETY_STATUS_VALUES: PersonSafetyStatus[] = [
  'safe',
  'at_shelter',
  'safe_elsewhere',
  'need_help',
]

export type PersonSafetyCheckinOption = {
  value: PersonSafetyStatus
  label: string
}

/** Options for "My Personal Safety" — maps to profiles.person_safety_status. */
export const PERSON_SAFETY_CHECKIN_STATUS_OPTIONS: PersonSafetyCheckinOption[] = [
  { value: 'safe', label: '✅ Safe' },
  { value: 'at_shelter', label: '🏥 At a shelter' },
  { value: 'safe_elsewhere', label: '📍 Safe elsewhere' },
  { value: 'need_help', label: '🆘 Need help' },
]

// ── Type guards ─────────────────────────────────────────────────────────────

export function isHomeEvacuationStatus(v: string | null | undefined): v is HomeEvacuationStatus {
  return v != null && (HOME_EVACUATION_STATUS_VALUES as string[]).includes(v)
}

export function isPersonSafetyStatus(v: string | null | undefined): v is PersonSafetyStatus {
  return v != null && (PERSON_SAFETY_STATUS_VALUES as string[]).includes(v)
}

// ── Legacy single-status → dual model (migration / evacuee_records / monitored) ─

/** Old evacuee_records / monitored_person_checkins / profiles.checkin_status values */
export type LegacySingleCheckinStatus =
  | 'evacuated'
  | 'sheltering'
  | 'returning'
  | 'unknown'
  | 'safe'
  | 'need_help'
  | HomeEvacuationStatus

/** Resolve home evacuation for map pins / lists when `home_evacuation_status` is set on demo or API rows. */
export function resolvePinHomeEvacuationStatus(pin: {
  status?: string | null
  home_evacuation_status?: HomeEvacuationStatus | null
}): HomeEvacuationStatus {
  if (pin.home_evacuation_status) return pin.home_evacuation_status
  return mapLegacyCheckinToDual(pin.status).home
}

export function mapLegacyCheckinToDual(
  legacy: string | null | undefined
): { home: HomeEvacuationStatus; safety: PersonSafetyStatus | null } {
  if (!legacy) return { home: 'not_evacuated', safety: null }
  switch (legacy) {
    case 'evacuated':
      return { home: 'evacuated', safety: 'safe' }
    case 'sheltering':
      return { home: 'evacuated', safety: 'at_shelter' }
    case 'returning':
      return { home: 'not_evacuated', safety: 'safe' }
    case 'unknown':
      return { home: 'not_evacuated', safety: null }
    case 'safe':
      return { home: 'not_evacuated', safety: 'safe' }
    case 'need_help':
      return { home: 'cannot_evacuate', safety: 'need_help' }
    case 'not_evacuated':
      return { home: 'not_evacuated', safety: null }
    case 'cannot_evacuate':
      return { home: 'cannot_evacuate', safety: 'need_help' }
    default:
      return { home: 'not_evacuated', safety: null }
  }
}

export function labelForHomeEvacuationStatus(h: HomeEvacuationStatus): string {
  return HOME_CHECKIN_STATUS_OPTIONS.find(o => o.value === h)?.label ?? h
}

export function labelForPersonSafetyStatus(
  s: PersonSafetyStatus,
  opts?: { shelterName?: string | null; locationNote?: string | null }
): string {
  const base = PERSON_SAFETY_CHECKIN_STATUS_OPTIONS.find(o => o.value === s)?.label ?? s
  if (s === 'at_shelter' && opts?.shelterName?.trim()) {
    return `${base} — ${opts.shelterName.trim()}`
  }
  if (s === 'safe_elsewhere' && opts?.locationNote?.trim()) {
    return `${base} — ${opts.locationNote.trim()}`
  }
  return base
}

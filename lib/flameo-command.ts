import type { HouseholdPin } from '@/lib/responder-household'
import type { FirefighterPin } from '@/lib/firefighter-pin'
import { distanceMiles } from '@/lib/hub-map-distance'
import type {
  CommandActionRequired,
  CommandFieldUnitReporting,
  FlameoCommandContext,
  FlameoCommandFireContext,
  FlameoCommandIncidentSummary,
  PriorityAssignment,
  PriorityAssignmentMember,
} from '@/lib/flameo-command-types'

function lower(s: string): string {
  return s.toLowerCase()
}

/** O2 / ventilator — highest urgency for sort and EMS routing. */
export function isOxygenVentilatorMed(s: string): boolean {
  const x = lower(s)
  return x.includes('oxygen') || x.includes('ventilator') || /\bo2\b/.test(x)
}

export function isDialysisMed(s: string): boolean {
  return lower(s).includes('dialysis')
}

export function isPacemakerMed(s: string): boolean {
  const x = lower(s)
  return x.includes('pacemaker') || x.includes('cardiac device')
}

export function isLifeCriticalMedical(s: string): boolean {
  return isOxygenVentilatorMed(s) || isDialysisMed(s) || isPacemakerMed(s)
}

function hasLifeCriticalInStrings(arr: string[]): boolean {
  return arr.some(isLifeCriticalMedical)
}

export function hasLifeCriticalHousehold(pin: HouseholdPin): boolean {
  if (hasLifeCriticalInStrings(pin.medical_flags)) return true
  return pin.members.some(m => hasLifeCriticalInStrings(m.medical_needs))
}

function isMobilityTransport(s: string): boolean {
  const x = lower(s)
  return (
    x.includes('wheelchair')
    || x.includes('mobility device')
    || x.includes('mobility')
    || x.includes('assistance')
    || x.includes('bedridden')
    || x.includes('limited mobility')
    || x.includes('walk')
    || x.includes('distance')
  )
}

export function hasMobilityTransportNeed(pin: HouseholdPin): boolean {
  if (pin.mobility_flags.some(isMobilityTransport)) return true
  return pin.members.some(m => m.mobility_needs.some(isMobilityTransport))
}

/** Higher = more urgent for tie-break (O2 > dialysis > pacemaker > other medical). */
export function medicalPriorityScore(pin: HouseholdPin): number {
  const collect: string[] = [...pin.medical_flags]
  for (const m of pin.members) collect.push(...m.medical_needs)
  let score = 0
  for (const s of collect) {
    if (isOxygenVentilatorMed(s)) score += 10_000
    else if (isDialysisMed(s)) score += 1_000
    else if (isPacemakerMed(s)) score += 100
    else if (s.trim()) score += 1
  }
  return score
}

function memberDisplayFlags(m: HouseholdPin['members'][number]): string[] {
  const out: string[] = []
  for (const x of m.mobility_needs) {
    if (x.trim()) out.push(x.trim())
  }
  for (const x of m.medical_needs) {
    if (x.trim()) out.push(x.trim())
  }
  if (m.disability_other?.trim()) out.push(m.disability_other.trim())
  if (m.medical_other?.trim()) out.push(m.medical_other.trim())
  return [...new Set(out)]
}

function assignmentMembers(pin: HouseholdPin): PriorityAssignmentMember[] {
  return pin.members.map(m => ({
    name: m.name,
    status: m.home_evacuation_status,
    flags: memberDisplayFlags(m),
  }))
}

function actionRequiredForPin(pin: HouseholdPin): CommandActionRequired {
  const life = hasLifeCriticalHousehold(pin)
  const mob = hasMobilityTransportNeed(pin)
  if (life) return 'EMS'
  if (mob) return 'TRANSPORT'
  if (pin.not_evacuated > 0 && pin.mobility_flags.length === 0 && pin.medical_flags.length === 0) {
    const anyMemberFlags = pin.members.some(
      mm => mm.mobility_needs.length > 0 || mm.medical_needs.length > 0
    )
    if (!anyMemberFlags) return 'CHECK'
  }
  if (pin.total_people > 0 && pin.evacuated === pin.total_people) return 'CLEAR'
  if (pin.not_evacuated > 0) return 'CHECK'
  return 'CLEAR'
}

function lifeCriticalPhrase(pin: HouseholdPin): string | null {
  for (const s of pin.medical_flags) {
    if (isOxygenVentilatorMed(s)) return 'requires O2 equipment'
    if (isDialysisMed(s)) return 'requires dialysis support'
    if (isPacemakerMed(s)) return 'cardiac device / pacemaker'
  }
  for (const m of pin.members) {
    for (const s of m.medical_needs) {
      if (isOxygenVentilatorMed(s)) return 'requires O2 equipment'
      if (isDialysisMed(s)) return 'requires dialysis support'
      if (isPacemakerMed(s)) return 'cardiac device / pacemaker'
    }
  }
  return null
}

function buildReason(pin: HouseholdPin, action: CommandActionRequired): string {
  const n = pin.total_people
  const ne = pin.needs_help
  const parts: string[] = [`${n} people at this address.`]
  if (ne > 0) {
    const lc = lifeCriticalPhrase(pin)
    parts.push(`${ne} cannot evacuate${lc ? ` — ${lc}` : ''}.`)
  } else if (pin.not_evacuated > 0) {
    parts.push(`${pin.not_evacuated} not yet evacuated.`)
  }
  if (action === 'EMS') {
    parts.push('EMS unit needed.')
  } else if (action === 'TRANSPORT') {
    parts.push('Transport / assisted evacuation likely needed.')
  } else if (action === 'CHECK') {
    parts.push('Wellness check recommended.')
  } else {
    parts.push('Area clear for this household.')
  }
  return parts.join(' ')
}

export function buildIncidentSummary(pins: HouseholdPin[]): FlameoCommandIncidentSummary {
  let total_people = 0
  let evacuated = 0
  let not_evacuated = 0
  let needs_help = 0
  for (const p of pins) {
    total_people += p.total_people
    evacuated += p.evacuated
    not_evacuated += p.not_evacuated
    needs_help += p.needs_help
  }
  const total_households = pins.length
  const completion_rate =
    total_people > 0 ? Math.round((100 * evacuated) / total_people) : 0
  return {
    total_households,
    total_people,
    evacuated,
    not_evacuated,
    needs_help,
    completion_rate,
  }
}

function nearestFirefighterForHousehold(
  pin: HouseholdPin,
  firefighters: FirefighterPin[]
): Pick<PriorityAssignment, 'assigned_to' | 'assigned_firefighter_id' | 'estimated_travel_minutes'> {
  const eligible = firefighters.filter(
    f =>
      f.status === 'active'
      && Number.isFinite(f.lat)
      && Number.isFinite(f.lng)
  )
  if (eligible.length === 0) return {}

  let best = eligible[0]!
  let bestD = distanceMiles([pin.lat, pin.lng], [best.lat, best.lng])
  for (let i = 1; i < eligible.length; i++) {
    const f = eligible[i]!
    const d = distanceMiles([pin.lat, pin.lng], [f.lat, f.lng])
    if (d < bestD) {
      bestD = d
      best = f
    }
  }
  const mph = 25
  const minutes = Math.max(1, Math.round((bestD / mph) * 60))
  return {
    assigned_to: best.name,
    assigned_firefighter_id: best.id,
    estimated_travel_minutes: minutes,
  }
}

export function buildPriorityAssignments(
  pins: HouseholdPin[],
  firefighters: FirefighterPin[] = []
): PriorityAssignment[] {
  const filtered = pins.filter(p => p.priority === 'CRITICAL' || p.priority === 'HIGH')
  const sorted = [...filtered].sort((a, b) => {
    if (b.needs_help !== a.needs_help) return b.needs_help - a.needs_help
    const ms = medicalPriorityScore(b) - medicalPriorityScore(a)
    if (ms !== 0) return ms
    return b.not_evacuated - a.not_evacuated
  })
  const top = sorted.slice(0, 10)
  return top.map((pin, i) => {
    const action_required = actionRequiredForPin(pin)
    const ff = nearestFirefighterForHousehold(pin, firefighters)
    return {
      rank: i + 1,
      address: pin.address,
      lat: pin.lat,
      lng: pin.lng,
      reason: buildReason(pin, action_required),
      action_required,
      people_count: pin.total_people,
      cannot_evacuate_count: pin.needs_help,
      mobility_flags: [...pin.mobility_flags],
      medical_flags: [...pin.medical_flags],
      members: assignmentMembers(pin),
      ...ff,
    }
  })
}

/**
 * Households for command briefing: within `zoneMiles` of map center, and when `fires` is non-empty,
 * within `fireProximityMiles` of at least one incident (NIFC points already scoped to the hub).
 * Excludes opt-in profiles outside the operational area (e.g. other states).
 */
export function filterHouseholdsForIncidentBriefing(
  pins: HouseholdPin[],
  mapCenter: [number, number],
  zoneMiles: number,
  fires: Array<{ latitude: number; longitude: number }>,
  fireProximityMiles: number,
): HouseholdPin[] {
  const [clat, clng] = mapCenter
  if (!Number.isFinite(clat) || !Number.isFinite(clng) || zoneMiles <= 0) return pins
  const byCenter = pins.filter(
    p =>
      Number.isFinite(p.lat)
      && Number.isFinite(p.lng)
      && distanceMiles([p.lat, p.lng], [clat, clng]) <= zoneMiles
  )
  const validFires = fires.filter(
    f => Number.isFinite(f.latitude) && Number.isFinite(f.longitude)
  )
  if (validFires.length === 0) return byCenter
  const cap = Math.min(fireProximityMiles, zoneMiles)
  return byCenter.filter(pin => {
    let minD = Infinity
    for (const f of validFires) {
      const d = distanceMiles([pin.lat, pin.lng], [f.latitude, f.longitude])
      if (d < minD) minD = d
    }
    return minD <= cap
  })
}

export function assembleFlameoCommandContext(
  pins: HouseholdPin[],
  fire_context: FlameoCommandFireContext,
  firefighters: FirefighterPin[] = [],
  rosterFieldUnitTotal: number = 0
): FlameoCommandContext {
  const field_units_reporting: CommandFieldUnitReporting[] = firefighters.map(f => ({
    name: f.name,
    lat: f.lat,
    lng: f.lng,
    status: f.status,
    current_assignment: f.current_assignment,
    last_seen_at: f.last_seen_at,
  }))
  const reporting = field_units_reporting.length
  const field_units_without_position_count = Math.max(0, rosterFieldUnitTotal - reporting)

  return {
    incident_summary: buildIncidentSummary(pins),
    priority_assignments: buildPriorityAssignments(pins, firefighters),
    fire_context,
    generated_at: new Date().toISOString(),
    field_units_reporting,
    field_units_without_position_count,
  }
}

/** LLM and fallback briefings emit this line between situation (tabs: Situation) and the rest (tabs: Priorities). */
export const FLAMEO_COMMAND_PRIORITY_SECTION_DELIMITER = '---FLAMEO_COMMAND_PRIORITIES---' as const

export function splitFlameoCommandBriefing(briefing: string): {
  overview: string
  priorities: string
} {
  const d = FLAMEO_COMMAND_PRIORITY_SECTION_DELIMITER
  const i = briefing.indexOf(d)
  if (i === -1) return { overview: briefing.trim(), priorities: '' }
  return {
    overview: briefing.slice(0, i).trim(),
    priorities: briefing.slice(i + d.length).trim(),
  }
}

export function commandBriefingFallback(ctx: FlameoCommandContext): string {
  const pa = ctx.priority_assignments
  const x = pa.length
  const y = ctx.incident_summary.needs_help
  const first = pa[0]
  const ffN = ctx.field_units_reporting?.length ?? 0
  const ffMissing = ctx.field_units_without_position_count ?? 0

  let dispatch = ''
  if (ffN > 0) {
    dispatch = ` ${ffN} field unit(s) reporting position.`
    if (first?.assigned_to) {
      dispatch += ` Suggested: send ${first.assigned_to} toward top priority (${first.address}${typeof first.estimated_travel_minutes === 'number' ? `, ~${first.estimated_travel_minutes} min est.` : ''}).`
    } else if (first) {
      dispatch += ` Assign nearest available unit to ${first.address}.`
    }
  } else if (ffMissing > 0) {
    dispatch = ` No GPS positions from roster (${ffMissing} on roster not reporting location — have units check in on the app).`
  }

  if (!first) {
    return `${ctx.incident_summary.total_households} households in zone. No critical queue — maintain patrol pattern.${dispatch}`
  }
  const overview = `${x} households need immediate attention. ${y} people cannot self-evacuate.`
  const priorities = `Top priority: ${first.address} — ${first.reason}.${dispatch}`
  return `${overview}\n\n${FLAMEO_COMMAND_PRIORITY_SECTION_DELIMITER}\n\n${priorities}`
}

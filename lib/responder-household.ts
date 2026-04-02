import { geocodeAddress } from '@/lib/geocoding'
import { isHomeEvacuationStatus, type HomeEvacuationStatus } from '@/lib/checkin-status'

/** Profile row shape returned by GET /api/responder/evacuees (after mapping). */
export type ResponderEvacueeProfile = {
  id: string
  full_name: string | null
  home_address: string
  home_evacuation_status: string
  home_status_updated_at: string | null
  mobility_needs: string[]
  medical_needs: string[]
  disability_other: string | null
  medical_other: string | null
  work_address: string | null
  work_building_type: string | null
  work_floor_number: number | null
  phone: string | null
}

export interface HouseholdMember {
  id: string
  name: string
  home_evacuation_status: string
  home_status_updated_at: string | null
  mobility_needs: string[]
  medical_needs: string[]
  disability_other: string | null
  medical_other: string | null
  phone: string | null
  work_address: string | null
}

export type HouseholdPriority = 'CRITICAL' | 'HIGH' | 'MONITOR' | 'CLEAR'

export interface HouseholdOfficeSite {
  key: string
  address: string
  lat: number
  lng: number
}

export interface HouseholdPin {
  id: string
  address: string
  lat: number
  lng: number
  total_people: number
  evacuated: number
  not_evacuated: number
  needs_help: number
  members: HouseholdMember[]
  priority: HouseholdPriority
  mobility_flags: string[]
  medical_flags: string[]
  /** Geocoded work addresses (distinct from home) for responder map office markers. */
  officeSites?: HouseholdOfficeSite[]
  is_demo?: boolean
}

const geocodeCache = new Map<string, { lat: number; lng: number }>()
const workGeocodeCache = new Map<string, { lat: number; lng: number }>()

/** Lowercase, trim, collapse spaces; strip apt/unit-style segments for grouping only. */
export function normalizeAddressForGrouping(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  s = s.replace(/\s*,\s*(apt|apartment|unit|suite|ste|building|bldg)\.?\s*[a-z0-9\-/#]+/gi, '')
  s = s.replace(/\s+#\s*[a-z0-9\-]+/gi, '')
  s = s.replace(/\s+floor\s+[a-z0-9]+/gi, '')
  return s.trim()
}

function uniqueStrings(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))]
}

function memberStatus(s: string): HomeEvacuationStatus {
  return isHomeEvacuationStatus(s) ? s : 'not_evacuated'
}

function computePriority(input: {
  needs_help: number
  not_evacuated: number
  mobility_flags: string[]
  medical_flags: string[]
  total_people: number
  evacuated: number
}): HouseholdPriority {
  if (input.needs_help > 0) return 'CRITICAL'
  if (input.total_people > 0 && input.evacuated === input.total_people) return 'CLEAR'
  if (input.mobility_flags.length > 0) return 'HIGH'
  if (input.not_evacuated > 0 && input.mobility_flags.length === 0 && input.medical_flags.length === 0) {
    return 'MONITOR'
  }
  if (input.not_evacuated > 0) return 'HIGH'
  return 'CLEAR'
}

export async function buildHouseholdPins(profiles: ResponderEvacueeProfile[]): Promise<HouseholdPin[]> {
  const byKey = new Map<string, ResponderEvacueeProfile[]>()
  for (const p of profiles) {
    const key = normalizeAddressForGrouping(p.home_address)
    if (!key) continue
    const list = byKey.get(key) ?? []
    list.push(p)
    byKey.set(key, list)
  }

  const out: HouseholdPin[] = []

  for (const [, group] of byKey) {
    if (group.length === 0) continue
    const displayAddress = group[0]!.home_address.trim()

    let lat: number
    let lng: number
    const geoKey = normalizeAddressForGrouping(displayAddress)
    const cached = geocodeCache.get(geoKey)
    if (cached) {
      lat = cached.lat
      lng = cached.lng
    } else {
      try {
        const g = await geocodeAddress(displayAddress)
        lat = g.lat
        lng = g.lng
        geocodeCache.set(geoKey, { lat, lng })
      } catch {
        continue
      }
    }

    const members: HouseholdMember[] = group.map(p => ({
      id: p.id,
      name: (p.full_name?.trim() || 'Unknown').trim(),
      home_evacuation_status: memberStatus(p.home_evacuation_status),
      home_status_updated_at: p.home_status_updated_at ?? null,
      mobility_needs: [...(p.mobility_needs ?? [])],
      medical_needs: [...(p.medical_needs ?? [])],
      disability_other: p.disability_other,
      medical_other: p.medical_other,
      phone: p.phone,
      work_address: p.work_address,
    }))

    let evacuated = 0
    let not_evacuated = 0
    let needs_help = 0
    const mobilityFlat: string[] = []
    const medicalFlat: string[] = []

    for (const m of members) {
      const st = m.home_evacuation_status
      if (st === 'evacuated') evacuated += 1
      else if (st === 'not_evacuated') not_evacuated += 1
      else if (st === 'cannot_evacuate') needs_help += 1
      mobilityFlat.push(...m.mobility_needs)
      medicalFlat.push(...m.medical_needs)
    }

    const mobility_flags = uniqueStrings(mobilityFlat)
    const medical_flags = uniqueStrings(medicalFlat)

    const priority = computePriority({
      needs_help,
      not_evacuated,
      mobility_flags,
      medical_flags,
      total_people: members.length,
      evacuated,
    })

    const officeSites: HouseholdOfficeSite[] = []
    const seenWork = new Set<string>()
    for (const m of members) {
      const rawW = m.work_address?.trim()
      if (!rawW) continue
      const wk = normalizeAddressForGrouping(rawW)
      if (!wk || wk === geoKey) continue
      if (seenWork.has(wk)) continue
      seenWork.add(wk)
      const wCached = workGeocodeCache.get(wk)
      if (wCached) {
        officeSites.push({ key: wk, address: rawW, lat: wCached.lat, lng: wCached.lng })
        continue
      }
      try {
        const wg = await geocodeAddress(rawW)
        workGeocodeCache.set(wk, { lat: wg.lat, lng: wg.lng })
        officeSites.push({ key: wk, address: rawW, lat: wg.lat, lng: wg.lng })
      } catch {
        /* skip ungeocodable work */
      }
    }

    out.push({
      id: `hh-${group[0]!.id}`,
      address: displayAddress,
      lat,
      lng,
      total_people: members.length,
      evacuated,
      not_evacuated,
      needs_help,
      members,
      priority,
      mobility_flags,
      medical_flags,
      officeSites: officeSites.length > 0 ? officeSites : undefined,
    })
  }

  return out
}

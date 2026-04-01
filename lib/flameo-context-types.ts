/**
 * Phase A (ANISHA): structured context for Flameo — no LLM.
 * @see ANISHA_flameo-agentic-transformation.md
 */

export type FlameoUserRole = 'evacuee' | 'emergency_responder'

/** Role sent to POST /api/ai (`flameoRole`) — maps consumer + responder chat modes */
export type FlameoAiRole = 'caregiver' | 'evacuee' | 'responder'

export type FlameoContextStatus =
  | 'ready'
  /** Profile has no usable home address */
  | 'address_missing'
  /** Address present but Nominatim / geocoding failed */
  | 'geocode_failed'
  /** NIFC + FIRMS both unavailable or failed */
  | 'feeds_unavailable'
  /** Some feeds failed but at least one source returned (e.g. NIFC ok, FIRMS 503) */
  | 'feeds_partial'
  /** Feeds ok, anchor resolved, no incidents within radius R */
  | 'no_fires_in_radius'

export interface FlameoAnchor {
  id: string
  label: string
  lat: number
  lon: number
}

export interface FlameoIncidentNearby {
  id: string
  source: 'nifc' | 'firms'
  /** Shortest distance to this incident (same anchor as `nearest_anchor_id` when only one applies). */
  distance_miles: number
  name: string | null
  lat: number
  lon: number
  /** Miles from saved home (geocoded profile address). */
  distance_miles_from_home?: number
  /** Miles from live GPS when client sent `liveLat`/`liveLon` and it differs from home. */
  distance_miles_from_live?: number | null
  /** Which reference point is closest to this incident. */
  nearest_anchor_id?: 'home' | 'live' | 'work' | 'unknown'
}

/** Active grounding anchor for copy and UI (work / unknown modes from client). */
export interface FlameoLocationAnchorDetail {
  anchor: 'home' | 'work' | 'unknown'
  anchor_address?: string | null
  building_type?: string | null
  floor_number?: number | null
  location_note?: string | null
}

export interface FlameoContextFlags {
  /** True iff there is at least one incident within alert radius R */
  has_confirmed_threat: boolean
  /** True when we cannot show any nearby incident (missing address, no data in radius, or no feeds) */
  no_data: boolean
  /** True when anchors include both saved home and live GPS (they differ beyond a small threshold). */
  live_differs_from_home?: boolean
}

export interface FlameoWeatherSummary {
  temp_f: number | null
  wind_mph: number | null
  wind_dir: string | null
  wind_dir_deg: number | null
  fire_risk: string
}

export interface FlameoHazardSite {
  id: string
  name: string
  type: 'nuclear' | 'chemical' | 'lng_energy'
  lat: number
  lon: number
  distance_miles: number
  risk_note: string
}

export interface FlameoShelterNearby {
  name: string
  county: string
  lat: number
  lon: number
  distance_miles: number
  phone?: string | null
}

export interface FlameoShelterRouteRanked {
  name: string
  lat: number
  lon: number
  travel_minutes: number
  distance_miles: number
  route_summary: string
  route_avoids_fire: boolean
  passes_near_hazard?: boolean
  accessibility_likely?: boolean
  phone?: string | null
}

export interface FlameoContext {
  role: FlameoUserRole
  /** Usually `[home]`; includes `live` when the client sends GPS that differs from geocoded home. */
  anchors: FlameoAnchor[]
  incidents_nearby: FlameoIncidentNearby[]
  weather_summary: FlameoWeatherSummary | null
  hazard_sites_nearby: FlameoHazardSite[]
  shelters_nearby?: FlameoShelterNearby[]
  shelters_ranked?: FlameoShelterRouteRanked[]
  flags: FlameoContextFlags
  /** Miles — from profile `alert_radius_miles` or default */
  alert_radius_miles: number
  /** Distance between geocoded home and live GPS when both anchors are active (mi). */
  live_vs_home_miles?: number | null
  /** When client signals work / unknown anchor; drives briefing and floor guidance. */
  location_anchor?: FlameoLocationAnchorDetail
}

/** POST /api/flameo/briefing */
export interface FlameoBriefingApiResponse {
  briefing: string
  grounded: boolean
  fallback: boolean
}

/** API JSON body for GET /api/flameo/context */
export interface FlameoContextApiResponse {
  status: FlameoContextStatus
  /** Human-readable detail for UI (errors, partial feeds) */
  message?: string
  context: FlameoContext
  /** Which upstream feeds succeeded */
  feeds?: {
    nifc: boolean
    firms: boolean
  }
}

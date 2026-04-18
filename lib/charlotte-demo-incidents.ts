import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'

/**
 * Training incidents near Charlotte, NC — **always** merged into live data:
 * - `GET /api/fires/nifc` appends these (Flameo context, evac hub map, ER command map)
 * - `GET /api/push/check` appends matching rows for Flameo escalation alongside `fire_events`
 *
 * One pin is **urban** (Charlotte core); one is **rural** (northwest of the metro). Users only see
 * them in Flameo / pushes when their home (and alert radius) intersects these coordinates.
 */

/** NIFC-shaped points for map + Flameo (`/api/flameo/context` uses `/api/fires/nifc`). */
export const CHARLOTTE_DEMO_NIFC_INCIDENTS: NifcFire[] = [
  {
    id: 'wfa-demo-charlotte-urban',
    latitude: 35.2255,
    longitude: -80.8411,
    fire_name: 'Demo — Charlotte urban (training)',
    acres: 285,
    containment: 14,
    source: 'nifc_incident',
  },
  {
    id: 'wfa-demo-charlotte-rural',
    latitude: 35.392,
    longitude: -81.184,
    fire_name: 'Demo — Charlotte rural west (training)',
    acres: 1840,
    containment: 6,
    source: 'nifc_incident',
  },
]

/** Rows compatible with `push/check` `analyzeFireEvents` (Supabase `fire_events` shape). */
export function charlotteDemoFireEventRowsForPush(): Array<{
  latitude: number
  longitude: number
  has_evacuation_order: boolean | null
  containment_pct: number | null
}> {
  return [
    {
      latitude: CHARLOTTE_DEMO_NIFC_INCIDENTS[0].latitude,
      longitude: CHARLOTTE_DEMO_NIFC_INCIDENTS[0].longitude,
      has_evacuation_order: false,
      containment_pct: CHARLOTTE_DEMO_NIFC_INCIDENTS[0].containment,
    },
    {
      latitude: CHARLOTTE_DEMO_NIFC_INCIDENTS[1].latitude,
      longitude: CHARLOTTE_DEMO_NIFC_INCIDENTS[1].longitude,
      has_evacuation_order: true,
      containment_pct: CHARLOTTE_DEMO_NIFC_INCIDENTS[1].containment,
    },
  ]
}

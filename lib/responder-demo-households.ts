import type { HouseholdPin } from '@/lib/responder-household'
import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'
import { distanceMiles } from '@/lib/hub-map-distance'

/** Charlotte, NC — demo framing for responder evacuation map + field hub demo pins. */
export const FIELD_HUB_DEMO_MAP_CENTER: [number, number] = [35.21, -80.84]

/** Demo households — Charlotte / Mecklenburg area (responder evacuation + field hub). */
export const RESPONDER_DEMO_HOUSEHOLDS: HouseholdPin[] = [
  {
    id: 'demo-hh-moss',
    address: '1840 East Blvd, Charlotte, NC',
    lat: 35.209,
    lng: -80.847,
    total_people: 3,
    evacuated: 1,
    not_evacuated: 1,
    needs_help: 1,
    priority: 'CRITICAL',
    mobility_flags: ['Uses wheelchair or mobility device', 'Requires assistance to evacuate'],
    medical_flags: ['Requires oxygen or ventilator'],
    members: [
      {
        id: 'demo-hh-moss-1',
        name: 'Linda Johnson',
        home_evacuation_status: 'cannot_evacuate',
        home_status_updated_at: '2026-03-31T15:02:00.000Z',
        mobility_needs: ['Uses wheelchair or mobility device'],
        medical_needs: ['Requires oxygen or ventilator'],
        disability_other: null,
        medical_other: null,
        phone: '(704) 555-0142',
        work_address: null,
      },
      {
        id: 'demo-hh-moss-2',
        name: 'Robert Johnson',
        home_evacuation_status: 'evacuated',
        home_status_updated_at: '2026-03-31T12:00:00.000Z',
        mobility_needs: [],
        medical_needs: [],
        disability_other: null,
        medical_other: null,
        phone: null,
        work_address: null,
      },
      {
        id: 'demo-hh-moss-3',
        name: 'Maria Johnson',
        home_evacuation_status: 'not_evacuated',
        home_status_updated_at: '2026-03-31T14:30:00.000Z',
        mobility_needs: [],
        medical_needs: [],
        disability_other: null,
        medical_other: null,
        phone: null,
        work_address: null,
      },
    ],
  },
  {
    id: 'demo-hh-branch',
    address: '3300 Rama Rd, Charlotte, NC',
    lat: 35.182,
    lng: -80.829,
    total_people: 1,
    evacuated: 0,
    not_evacuated: 1,
    needs_help: 0,
    priority: 'MONITOR',
    mobility_flags: ['Cannot walk long distances'],
    medical_flags: [],
    members: [
      {
        id: 'demo-hh-branch-1',
        name: 'James Harrington',
        home_evacuation_status: 'not_evacuated',
        home_status_updated_at: '2026-03-31T14:45:00.000Z',
        mobility_needs: ['Cannot walk long distances'],
        medical_needs: [],
        disability_other: null,
        medical_other: 'Lives alone, elderly',
        phone: '(704) 555-0521',
        work_address: null,
      },
    ],
  },
  {
    id: 'demo-hh-flowes',
    address: '5710 E W.T. Harris Blvd, Charlotte, NC',
    lat: 35.252,
    lng: -80.765,
    total_people: 2,
    evacuated: 0,
    not_evacuated: 1,
    needs_help: 1,
    priority: 'CRITICAL',
    mobility_flags: [],
    medical_flags: ['Requires dialysis'],
    members: [
      {
        id: 'demo-hh-flowes-1',
        name: 'Carol Simmons',
        home_evacuation_status: 'cannot_evacuate',
        home_status_updated_at: '2026-03-31T15:10:00.000Z',
        mobility_needs: [],
        medical_needs: ['Requires dialysis'],
        disability_other: null,
        medical_other: null,
        phone: '(704) 555-0844',
        work_address: null,
      },
      {
        id: 'demo-hh-flowes-2',
        name: 'David Simmons',
        home_evacuation_status: 'not_evacuated',
        home_status_updated_at: '2026-03-31T13:00:00.000Z',
        mobility_needs: [],
        medical_needs: [],
        disability_other: null,
        medical_other: null,
        phone: null,
        work_address: null,
      },
    ],
  },
  {
    id: 'demo-hh-kannapolis',
    address: '12700 York Rd, Charlotte, NC',
    lat: 35.138,
    lng: -80.928,
    total_people: 1,
    evacuated: 0,
    not_evacuated: 0,
    needs_help: 1,
    priority: 'CRITICAL',
    mobility_flags: ['Bedridden or limited mobility', 'Requires assistance to evacuate'],
    medical_flags: [],
    members: [
      {
        id: 'demo-hh-kannapolis-1',
        name: 'Earl Thompson',
        home_evacuation_status: 'cannot_evacuate',
        home_status_updated_at: '2026-03-31T15:08:00.000Z',
        mobility_needs: ['Bedridden or limited mobility', 'Requires assistance to evacuate'],
        medical_needs: [],
        disability_other: null,
        medical_other: 'EMS required',
        phone: '(704) 555-1367',
        work_address: null,
      },
    ],
  },
]

/** Simulated NIFC-style points near Charlotte for demo / training (circle markers only on map). */
export const CHARLOTTE_DEMO_NIFC_FIRES: NifcFire[] = [
  {
    id: 'charlotte-demo-nifc-1',
    latitude: 35.168,
    longitude: -80.905,
    fire_name: 'Demo — Southwest corridor (training)',
    acres: 920,
    containment: 14,
    source: 'nifc_incident',
  },
  {
    id: 'charlotte-demo-nifc-2',
    latitude: 35.268,
    longitude: -80.72,
    fire_name: 'Demo — North Mecklenburg (training)',
    acres: 210,
    containment: 38,
    source: 'nifc_incident',
  },
  {
    id: 'charlotte-demo-nifc-3',
    latitude: 35.235,
    longitude: -80.79,
    fire_name: 'Demo — East sector (training)',
    acres: 45,
    containment: 62,
    source: 'nifc_incident',
  },
]

export const RESPONDER_DEMO_HOUSEHOLDS_TAGGED: HouseholdPin[] = RESPONDER_DEMO_HOUSEHOLDS.map(h => ({
  ...h,
  is_demo: true,
}))

export function responderFieldHubDemoWatchedLocations(): { label: string; lat: number; lng: number }[] {
  return RESPONDER_DEMO_HOUSEHOLDS.map(h => ({
    label: `${h.address.split(',')[0]?.trim() ?? 'Household'} (demo)`,
    lat: h.lat,
    lng: h.lng,
  }))
}

export function responderFieldHubDemoSituationPeople(
  incidents: Array<{ lat: number; lon: number }>,
  alertRadiusMiles: number
): Array<{
  id: string
  name: string
  address?: string
  home_evacuation_status: string | null
  in_danger_zone: boolean
}> {
  const out: Array<{
    id: string
    name: string
    address?: string
    home_evacuation_status: string | null
    in_danger_zone: boolean
  }> = []
  for (const h of RESPONDER_DEMO_HOUSEHOLDS) {
    const inDanger =
      incidents.length > 0 &&
      incidents.some(i => distanceMiles([h.lat, h.lng], [i.lat, i.lon]) <= alertRadiusMiles)
    for (const m of h.members) {
      out.push({
        id: m.id,
        name: m.name,
        address: h.address,
        home_evacuation_status: m.home_evacuation_status,
        in_danger_zone: inDanger,
      })
    }
  }
  return out
}

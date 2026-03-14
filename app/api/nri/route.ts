import { NextResponse } from 'next/server'

export interface NRICounty {
  fips: string
  county: string
  state: string
  nri_score: number
  nri_rating: string
  svi: number
  eal: number
}

interface NRIApiRecord {
  COUNTYFIPS?: string
  COUNTY?: string
  STATE?: string
  WLDF_RISKS?: number | null
  WLDF_RISKR?: string | null
  RPL_THEMES?: number | null
  EAL_VALT?: number | null
}

// Hardcoded fallback for top 20 high-risk counties (real FEMA NRI approximations)
const FALLBACK_COUNTIES: NRICounty[] = [
  { fips: '06083', county: 'Santa Barbara', state: 'CA', nri_score: 96.2, nri_rating: 'Very High', svi: 0.72, eal: 28400000 },
  { fips: '06037', county: 'Los Angeles', state: 'CA', nri_score: 95.8, nri_rating: 'Very High', svi: 0.69, eal: 1240000000 },
  { fips: '06111', county: 'Ventura', state: 'CA', nri_score: 94.7, nri_rating: 'Very High', svi: 0.63, eal: 91200000 },
  { fips: '06071', county: 'San Bernardino', state: 'CA', nri_score: 93.9, nri_rating: 'Very High', svi: 0.71, eal: 184000000 },
  { fips: '35031', county: 'McKinley', state: 'NM', nri_score: 92.4, nri_rating: 'Very High', svi: 0.88, eal: 12100000 },
  { fips: '04005', county: 'Coconino', state: 'AZ', nri_score: 91.8, nri_rating: 'Very High', svi: 0.79, eal: 38700000 },
  { fips: '06045', county: 'Mendocino', state: 'CA', nri_score: 91.3, nri_rating: 'Very High', svi: 0.77, eal: 24300000 },
  { fips: '35001', county: 'Bernalillo', state: 'NM', nri_score: 90.6, nri_rating: 'Very High', svi: 0.76, eal: 47100000 },
  { fips: '04007', county: 'Gila', state: 'AZ', nri_score: 90.1, nri_rating: 'Very High', svi: 0.82, eal: 18900000 },
  { fips: '06089', county: 'Shasta', state: 'CA', nri_score: 89.7, nri_rating: 'Very High', svi: 0.76, eal: 31400000 },
  { fips: '35006', county: 'Catron', state: 'NM', nri_score: 89.2, nri_rating: 'Very High', svi: 0.78, eal: 5200000 },
  { fips: '04012', county: 'La Paz', state: 'AZ', nri_score: 88.6, nri_rating: 'Very High', svi: 0.92, eal: 14700000 },
  { fips: '06105', county: 'Trinity', state: 'CA', nri_score: 88.1, nri_rating: 'Very High', svi: 0.72, eal: 6800000 },
  { fips: '06023', county: 'Humboldt', state: 'CA', nri_score: 87.4, nri_rating: 'Very High', svi: 0.83, eal: 18200000 },
  { fips: '41035', county: 'Klamath', state: 'OR', nri_score: 86.9, nri_rating: 'Very High', svi: 0.84, eal: 22600000 },
  { fips: '04001', county: 'Apache', state: 'AZ', nri_score: 86.3, nri_rating: 'Very High', svi: 0.82, eal: 9100000 },
  { fips: '06093', county: 'Siskiyou', state: 'CA', nri_score: 85.8, nri_rating: 'Very High', svi: 0.79, eal: 15300000 },
  { fips: '30009', county: 'Carbon', state: 'MT', nri_score: 84.2, nri_rating: 'High', svi: 0.61, eal: 7400000 },
  { fips: '16073', county: 'Owyhee', state: 'ID', nri_score: 83.7, nri_rating: 'High', svi: 0.71, eal: 5900000 },
  { fips: '32013', county: 'Humboldt', state: 'NV', nri_score: 82.9, nri_rating: 'High', svi: 0.62, eal: 8100000 },
]

const STATE_IDS = ['06', '41', '53', '16', '32', '04', '35', '08', '30']

async function fetchNRIForState(stateId: string): Promise<NRICounty[]> {
  const url = `https://hazards.fema.gov/nri/rest/api/nri/county?returnFormat=json&stateId=${stateId}`
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`NRI API error for state ${stateId}: ${res.status}`)
  const json = await res.json()

  const records: NRIApiRecord[] = Array.isArray(json) ? json : json?.items ?? json?.data ?? []
  return records
    .filter((r) => r.WLDF_RISKS != null && r.WLDF_RISKS > 0)
    .map((r) => ({
      fips: r.COUNTYFIPS ?? '',
      county: r.COUNTY ?? '',
      state: r.STATE ?? '',
      nri_score: typeof r.WLDF_RISKS === 'number' ? Math.round(r.WLDF_RISKS * 10) / 10 : 0,
      nri_rating: r.WLDF_RISKR ?? 'Unknown',
      svi: typeof r.RPL_THEMES === 'number' ? Math.round(r.RPL_THEMES * 100) / 100 : 0,
      eal: typeof r.EAL_VALT === 'number' ? Math.round(r.EAL_VALT) : 0,
    }))
}

export async function GET(_request: Request) {
  try {
    const results = await Promise.all(
      STATE_IDS.map((id) =>
        fetchNRIForState(id).catch(() => [] as NRICounty[])
      )
    )

    const counties = results
      .flat()
      .filter((c) => c.fips && c.county && c.nri_score > 0)
      .sort((a, b) => b.nri_score - a.nri_score)

    if (counties.length > 0) {
      return NextResponse.json({ counties, source: 'api' })
    }

    // All state fetches returned empty — use fallback
    return NextResponse.json({ counties: FALLBACK_COUNTIES, source: 'fallback' })
  } catch {
    return NextResponse.json({ counties: FALLBACK_COUNTIES, source: 'fallback' })
  }
}

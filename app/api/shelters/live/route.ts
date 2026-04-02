import { NextRequest, NextResponse } from 'next/server'
import { queryFemaOpenSheltersForState, type LiveShelter } from '@/lib/fema-live-shelters-query'

/** FEMA NSS data is queried from the public Open Shelters layer (gis.fema.gov). An alternate ArcGIS host path is often cited in docs but may 400; this endpoint matches the live service metadata. */

const CACHE_MS = 20 * 60 * 1000

type CacheEntry = { storedAt: number; body: Record<string, unknown> }

const cache = new Map<string, CacheEntry>()

function cacheKey(state: string, lat?: number, lng?: number): string {
  const la = lat != null && Number.isFinite(lat) ? lat.toFixed(2) : ''
  const ln = lng != null && Number.isFinite(lng) ? lng.toFixed(2) : ''
  return `${state.toUpperCase()}|${la}|${ln}`
}

/**
 * Public GET — live FEMA NSS open shelters for a state (server-side only).
 * Query: state (default NC), lat, lng optional for distance sort.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawState = (searchParams.get('state') || 'NC').trim().toUpperCase()
  const state = /^[A-Z]{2}$/.test(rawState) ? rawState : 'NC'

  const lat = parseFloat(searchParams.get('lat') || '')
  const lng = parseFloat(searchParams.get('lng') || '')
  const sortFrom =
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : null

  const key = cacheKey(state, sortFrom?.lat, sortFrom?.lng)
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.storedAt < CACHE_MS) {
    const ageSec = Math.floor((now - hit.storedAt) / 1000)
    const lastUp = new Date(hit.storedAt).toISOString()
    return NextResponse.json(hit.body, {
      headers: {
        'X-Cache-Age': String(ageSec),
        'X-Last-Updated': lastUp,
      },
    })
  }

  let shelters: LiveShelter[] = []
  let source_status: 'ok' | 'unavailable' = 'unavailable'
  let fallback = true
  const fetchedAt = new Date().toISOString()

  try {
    const q = await queryFemaOpenSheltersForState({
      state,
      sortFrom,
      resultRecordCount: 50,
      fetchedAt,
    })
    shelters = q.shelters
    if (q.ok) {
      source_status = 'ok'
      fallback = false
    }
  } catch {
    shelters = []
    source_status = 'unavailable'
    fallback = true
  }

  const body = {
    shelters,
    source_status,
    fallback,
    fetched_at: fetchedAt,
  }

  cache.set(key, { storedAt: now, body })

  return NextResponse.json(body, {
    headers: {
      'X-Cache-Age': '0',
      'X-Last-Updated': fetchedAt,
    },
  })
}

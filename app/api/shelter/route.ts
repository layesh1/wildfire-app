import { NextRequest, NextResponse } from 'next/server'
import { distanceMiles } from '@/lib/hub-map-distance'

type LatLng = { lat: number; lng: number }
type ShelterInput = { name: string; lat: number; lng: number }

type RouteRow = {
  shelter: ShelterInput
  duration_seconds: number
  distance_meters: number
  polyline: string
  summary: string
  passes_near_fire: boolean
}

const ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes'

function getRoutesKey(): string {
  const key = process.env.GOOGLE_ROUTES_API_KEY
  if (!key) throw new Error('Missing GOOGLE_ROUTES_API_KEY')
  return key
}

function toFireCenter(points: LatLng[] | undefined): LatLng | null {
  if (!points?.length) return null
  let sumLat = 0
  let sumLng = 0
  for (const p of points) {
    sumLat += p.lat
    sumLng += p.lng
  }
  return { lat: sumLat / points.length, lng: sumLng / points.length }
}

function encodePolyline(points: LatLng[]): string {
  let lastLat = 0
  let lastLng = 0
  let out = ''
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5)
    const lng = Math.round(p.lng * 1e5)
    out += encodeSigned(lat - lastLat) + encodeSigned(lng - lastLng)
    lastLat = lat
    lastLng = lng
  }
  return out
}

function encodeSigned(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1
  let out = ''
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
    v >>= 5
  }
  out += String.fromCharCode(v + 63)
  return out
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let i = 0
  let lat = 0
  let lng = 0
  while (i < encoded.length) {
    const dLat = decodeChunk(encoded, i)
    i = dLat.next
    lat += dLat.delta
    const dLng = decodeChunk(encoded, i)
    i = dLng.next
    lng += dLng.delta
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return points
}

function decodeChunk(encoded: string, start: number): { delta: number; next: number } {
  let result = 0
  let shift = 0
  let i = start
  while (i < encoded.length) {
    const b = encoded.charCodeAt(i++) - 63
    result |= (b & 0x1f) << shift
    shift += 5
    if (b < 0x20) break
  }
  const delta = (result & 1) ? ~(result >> 1) : (result >> 1)
  return { delta, next: i }
}

async function computeRoute(
  key: string,
  origin: LatLng,
  destination: LatLng,
  firePerimeter?: LatLng[]
): Promise<{ durationSeconds: number; distanceMeters: number; polyline: string; summary: string }> {
  const body: Record<string, unknown> = {
    origin: { location: { latLng: origin } },
    destination: { location: { latLng: destination } },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    polylineQuality: 'HIGH_QUALITY',
  }
  if (firePerimeter && firePerimeter.length >= 3) {
    body.routeModifiers = {
      // Keep request aligned with the requested feature; if this is unsupported for the
      // current project/API config, fallback request below is used.
      avoidAreas: [
        {
          polygon: {
            encodedPolyline: encodePolyline(firePerimeter),
          },
        },
      ],
    }
  }
  const fieldMask = [
    'routes.duration',
    'routes.distanceMeters',
    'routes.polyline.encodedPolyline',
    'routes.description',
  ].join(',')
  const tryRequest = async (payload: Record<string, unknown>) => {
    const res = await fetch(ROUTES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Routes API failed (${res.status})`)
    const data = (await res.json()) as {
      routes?: Array<{
        duration?: string
        distanceMeters?: number
        polyline?: { encodedPolyline?: string }
        description?: string
      }>
    }
    const first = data.routes?.[0]
    if (!first) throw new Error('No route returned')
    const sec = Number((first.duration || '0s').replace('s', ''))
    const distanceMeters = typeof first.distanceMeters === 'number' ? first.distanceMeters : 0
    const polyline = first.polyline?.encodedPolyline || ''
    return {
      durationSeconds: Number.isFinite(sec) ? sec : 0,
      distanceMeters,
      polyline,
      summary: first.description || 'Primary route',
    }
  }

  try {
    return await tryRequest(body)
  } catch {
    if (!body.routeModifiers) throw new Error('Routes request failed')
    const fallback = { ...body }
    delete fallback.routeModifiers
    return tryRequest(fallback)
  }
}

function passesNearFireCenter(polyline: string, fireCenter: LatLng | null): boolean {
  if (!polyline || !fireCenter) return false
  const pts = decodePolyline(polyline)
  for (const p of pts) {
    if (distanceMiles([p.lat, p.lng], [fireCenter.lat, fireCenter.lng]) <= 1) return true
  }
  return false
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    originLat?: number
    originLng?: number
    shelters?: ShelterInput[]
    firePerimeter?: LatLng[]
  }
  const originLat = body.originLat
  const originLng = body.originLng
  const shelters = Array.isArray(body.shelters) ? body.shelters : []
  if (
    typeof originLat !== 'number'
    || typeof originLng !== 'number'
    || !Number.isFinite(originLat)
    || !Number.isFinite(originLng)
    || !shelters.length
  ) {
    return NextResponse.json({ error: 'originLat, originLng, shelters are required' }, { status: 400 })
  }

  const key = getRoutesKey()
  const origin = { lat: originLat, lng: originLng }
  const firePerimeter =
    Array.isArray(body.firePerimeter)
      ? body.firePerimeter.filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
      : undefined
  const fireCenter = toFireCenter(firePerimeter)

  const out: RouteRow[] = []
  for (const shelter of shelters) {
    if (!Number.isFinite(shelter?.lat) || !Number.isFinite(shelter?.lng)) continue
    try {
      const route = await computeRoute(key, origin, { lat: shelter.lat, lng: shelter.lng }, firePerimeter)
      out.push({
        shelter,
        duration_seconds: route.durationSeconds,
        distance_meters: route.distanceMeters,
        polyline: route.polyline,
        summary: route.summary,
        passes_near_fire: passesNearFireCenter(route.polyline, fireCenter),
      })
    } catch {
      // Skip invalid route candidates.
    }
  }

  out.sort((a, b) => {
    if (a.passes_near_fire !== b.passes_near_fire) return a.passes_near_fire ? 1 : -1
    return a.duration_seconds - b.duration_seconds
  })

  return NextResponse.json({
    origin,
    fire_center: fireCenter,
    ranked: out.slice(0, 3),
  })
}

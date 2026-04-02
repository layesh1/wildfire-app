import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/geocoding'

/**
 * Forward geocode (address string → lat/lng) using the server Geocoding API key.
 * Browser-safe: the client must not call maps.googleapis.com/geocode directly (CORS / key limits).
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim()
  if (!address || address.length < 4) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }
  try {
    const r = await geocodeAddress(address)
    return NextResponse.json({
      lat: r.lat,
      lng: r.lng,
      formatted: r.formatted,
      types: r.types,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Geocoding failed' },
      { status: 404 }
    )
  }
}

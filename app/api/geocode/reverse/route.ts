import { NextRequest, NextResponse } from 'next/server'
import { reverseGeocode } from '@/lib/geocoding'

export async function GET(request: NextRequest) {
  const latRaw = request.nextUrl.searchParams.get('lat')
  const lngRaw = request.nextUrl.searchParams.get('lng')
  const lat = latRaw != null ? Number(latRaw) : NaN
  const lng = lngRaw != null ? Number(lngRaw) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
  }
  try {
    const r = await reverseGeocode(lat, lng)
    return NextResponse.json({ formatted: r.formatted })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Reverse geocoding failed' },
      { status: 404 }
    )
  }
}

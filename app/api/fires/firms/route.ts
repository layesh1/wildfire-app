import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = searchParams.get('days') || '1'
  const area = searchParams.get('area') || 'world'

  const FIRMS_KEY = process.env.NASA_FIRMS_API_KEY
  if (!FIRMS_KEY) {
    return NextResponse.json({ error: 'NASA FIRMS key not configured' }, { status: 503 })
  }

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_KEY}/VIIRS_SNPP_NRT/${area}/${days}`
    const res = await fetch(url, { next: { revalidate: 300 } }) // cache 5min

    if (!res.ok) throw new Error(`FIRMS API error: ${res.status}`)

    const csv = await res.text()
    const lines = csv.split('\n').filter(Boolean)
    const headers = lines[0].split(',')

    const firms = lines.slice(1).map(line => {
      const vals = line.split(',')
      return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim()]))
    }).filter(f => f.latitude && f.longitude)

    return NextResponse.json({ data: firms, count: firms.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

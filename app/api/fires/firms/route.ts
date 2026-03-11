import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // Area endpoint supports 1–5 days; country endpoint requires a different key tier
  const daysRaw = parseInt(searchParams.get('days') || '5', 10)
  const days = Math.min(Math.max(daysRaw, 1), 5)
  // Bounding box: W,S,E,N — contiguous US + Hawaii + southern Alaska
  const area = '-170,18,-65,72'
  const debug = searchParams.get('debug') === 'true'

  const FIRMS_KEY = process.env.NASA_FIRMS_API_KEY
  if (!FIRMS_KEY) {
    return NextResponse.json({ error: 'NASA FIRMS key not configured' }, { status: 503 })
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_KEY}/VIIRS_SNPP_NRT/${area}/${days}`

  try {
    // no-store to bypass any cached failed responses
    const res = await fetch(url, { cache: 'no-store' })
    const csv = await res.text()

    if (debug) {
      return NextResponse.json({ url, status: res.status, raw: csv.slice(0, 500) })
    }

    if (!res.ok) {
      return NextResponse.json({ error: `FIRMS HTTP ${res.status}`, raw: csv.slice(0, 200) }, { status: 500 })
    }

    // FIRMS sometimes returns 200 with an error message instead of CSV
    if (!csv.includes('latitude') && !csv.includes('latitude')) {
      return NextResponse.json({ error: 'FIRMS returned unexpected response', raw: csv.slice(0, 200) }, { status: 500 })
    }

    const lines = csv.split('\n').filter(Boolean)
    if (lines.length < 2) {
      // Valid response but no active fires in this region/period
      return NextResponse.json({ data: [], count: 0 })
    }

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

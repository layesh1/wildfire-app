import { NextRequest, NextResponse } from 'next/server'

async function geocode(location: string): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=us`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WildfireAlert/2.0 (wildfire-app@vercel.app)' },
    })
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name }
  } catch { return null }
}

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get('location')
  if (!location) return NextResponse.json({ error: 'location param required' }, { status: 400 })
  if (location.length > 200) return NextResponse.json({ error: 'location too long' }, { status: 400 })
  // Reject clearly invalid input — only printable ASCII + common address chars
  if (!/^[\w\s,.\-#/()]+$/.test(location)) {
    return NextResponse.json({ error: 'location contains invalid characters' }, { status: 400 })
  }

  const geo = await geocode(location)
  if (!geo) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  try {
    // Open-Meteo — free, no API key, no multi-hop failures like NOAA
    const omUrl = [
      `https://api.open-meteo.com/v1/forecast`,
      `?latitude=${geo.lat.toFixed(4)}&longitude=${geo.lon.toFixed(4)}`,
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`,
      `&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`,
    ].join('')

    const omRes = await fetch(omUrl)
    if (!omRes.ok) throw new Error(`Open-Meteo failed: ${omRes.status}`)
    const om = await omRes.json()
    const c = om.current

    const tempF = c.temperature_2m != null ? Math.round(c.temperature_2m) : null
    const windMph = c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) : null
    const humidityPct = c.relative_humidity_2m != null ? Math.round(c.relative_humidity_2m) : null
    const windDirDeg: number | null = c.wind_direction_10m ?? null
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const windDir = windDirDeg != null ? dirs[Math.round(windDirDeg / 45) % 8] : null

    let fireRisk = 'Low'
    let fireRiskColor = 'signal-safe'
    if (windMph != null && humidityPct != null && tempF != null) {
      if (windMph > 25 && humidityPct < 15 && tempF > 90) { fireRisk = 'Extreme'; fireRiskColor = 'signal-danger' }
      else if (windMph > 20 && humidityPct < 20) { fireRisk = 'Very High'; fireRiskColor = 'signal-danger' }
      else if (windMph > 15 && humidityPct < 25) { fireRisk = 'High'; fireRiskColor = 'signal-warn' }
      else if (windMph > 10 || humidityPct < 30) { fireRisk = 'Moderate'; fireRiskColor = 'signal-warn' }
    }
    const redFlag = windMph != null && humidityPct != null && windMph >= 25 && humidityPct <= 15

    return NextResponse.json({
      location: geo.display.split(',').slice(0, 2).join(',').trim(),
      lat: geo.lat,
      lon: geo.lon,
      temp_f: tempF,
      wind_mph: windMph,
      wind_dir: windDir,
      wind_dir_deg: windDirDeg,
      humidity_pct: humidityPct,
      fire_risk: fireRisk,
      fire_risk_color: fireRiskColor,
      red_flag: redFlag,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

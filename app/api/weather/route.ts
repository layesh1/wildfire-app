import { NextResponse } from 'next/server'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location')
  if (!location) return NextResponse.json({ error: 'location param required' }, { status: 400 })

  const geo = await geocode(location)
  if (!geo) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

  try {
    const pointsRes = await fetch(
      `https://api.weather.gov/points/${geo.lat.toFixed(4)},${geo.lon.toFixed(4)}`,
      { headers: { 'User-Agent': 'WildfireAlert/2.0', Accept: 'application/geo+json' } }
    )
    if (!pointsRes.ok) throw new Error(`NOAA points failed: ${pointsRes.status}`)
    const points = await pointsRes.json()

    const stationsUrl = points.properties?.observationStations
    if (!stationsUrl) throw new Error('No observation stations URL')

    const stationsRes = await fetch(stationsUrl, {
      headers: { 'User-Agent': 'WildfireAlert/2.0', Accept: 'application/geo+json' },
    })
    const stations = await stationsRes.json()
    const stationId = stations.features?.[0]?.properties?.stationIdentifier
    if (!stationId) throw new Error('No station found')

    const obsRes = await fetch(
      `https://api.weather.gov/stations/${stationId}/observations/latest`,
      { headers: { 'User-Agent': 'WildfireAlert/2.0', Accept: 'application/geo+json' } }
    )
    if (!obsRes.ok) throw new Error('Observations failed')
    const obs = await obsRes.json()
    const p = obs.properties

    const tempC = p.temperature?.value
    const tempF = tempC != null ? Math.round(tempC * 9 / 5 + 32) : null
    const windMph = p.windSpeed?.value != null ? Math.round(p.windSpeed.value * 0.621371) : null
    const windGustMph = p.windGust?.value != null ? Math.round(p.windGust.value * 0.621371) : null
    const humidityPct = p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null
    const visibilityMiles = p.visibility?.value != null ? Math.round(p.visibility.value * 0.000621371 * 10) / 10 : null
    const windDirDeg = p.windDirection?.value
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
      station: stationId,
      observed_at: p.timestamp,
      temp_f: tempF,
      wind_mph: windMph,
      wind_gust_mph: windGustMph,
      wind_dir: windDir,
      humidity_pct: humidityPct,
      visibility_miles: visibilityMiles,
      description: p.textDescription,
      fire_risk: fireRisk,
      fire_risk_color: fireRiskColor,
      red_flag: redFlag,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

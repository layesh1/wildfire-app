import { NextResponse } from 'next/server'

const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

function degToDir(deg: number): string {
  return DIRS[Math.round(deg / 22.5) % 16]
}

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32)
}

function msToMph(ms: number): number {
  return Math.round(ms * 2.23694 * 10) / 10
}

function mmToIn(mm: number): number {
  return Math.round(mm / 25.4 * 100) / 100
}

function fwiToRisk(fwi: number | null): string {
  if (fwi === null) return 'Unknown'
  if (fwi >= 50) return 'Extreme'
  if (fwi >= 38) return 'Very High'
  if (fwi >= 25) return 'High'
  if (fwi >= 12) return 'Moderate'
  return 'Low'
}

function fireRiskFromConditions(windMph: number, humidity: number, tempF: number): string {
  if (windMph > 25 && humidity < 15 && tempF > 90) return 'Extreme'
  if (windMph > 20 && humidity < 20) return 'Very High'
  if (windMph > 15 && humidity < 25) return 'High'
  if (windMph > 10 || humidity < 30) return 'Moderate'
  return 'Low'
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') ?? '36.7')
  const lon = parseFloat(searchParams.get('lon') ?? '-119.8')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: 'Invalid lat/lon parameters' }, { status: 400 })
  }

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const forecastUrl = [
    `https://api.open-meteo.com/v1/forecast`,
    `?latitude=${lat}&longitude=${lon}`,
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation`,
    `&daily=fire_danger_index,wind_speed_10m_max,wind_gusts_10m_max,relative_humidity_2m_min,precipitation_sum,temperature_2m_max`,
    `&forecast_days=7&timezone=America%2FLos_Angeles`,
  ].join('')

  const fwiUrl = [
    `https://climate-api.open-meteo.com/v1/climate`,
    `?latitude=${lat}&longitude=${lon}`,
    `&start_date=${isoDate(thirtyDaysAgo)}&end_date=${isoDate(today)}`,
    `&daily=fire_weather_index,duff_moisture_code,drought_code,initial_spread_index,buildup_index,fine_fuel_moisture_code`,
    `&models=ERA5`,
  ].join('')

  let forecastData: any = null
  let fwiData: any = null

  try {
    const [forecastRes, fwiRes] = await Promise.allSettled([
      fetch(forecastUrl, { next: { revalidate: 1800 } }),
      fetch(fwiUrl, { next: { revalidate: 1800 } }),
    ])

    if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
      forecastData = await forecastRes.value.json()
    }
    if (fwiRes.status === 'fulfilled' && fwiRes.value.ok) {
      fwiData = await fwiRes.value.json()
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Fetch failed: ${err.message}` }, { status: 502 })
  }

  // ── Current conditions ──
  let current: Record<string, any> = {
    temp_f: null,
    humidity_pct: null,
    wind_mph: null,
    wind_dir: null,
    fire_risk: 'Unknown',
  }

  if (forecastData?.current) {
    const c = forecastData.current
    const tempF = c.temperature_2m != null ? cToF(c.temperature_2m) : null
    const humidity = c.relative_humidity_2m != null ? Math.round(c.relative_humidity_2m) : null
    const windMph = c.wind_speed_10m != null ? msToMph(c.wind_speed_10m) : null
    const windDir = c.wind_direction_10m != null ? degToDir(c.wind_direction_10m) : null

    current = {
      temp_f: tempF,
      humidity_pct: humidity,
      wind_mph: windMph,
      wind_dir: windDir,
      fire_risk:
        tempF != null && humidity != null && windMph != null
          ? fireRiskFromConditions(windMph, humidity, tempF)
          : 'Unknown',
    }
  }

  // ── 7-day forecast ──
  const forecast7day: any[] = []
  if (forecastData?.daily) {
    const d = forecastData.daily
    const len = d.time?.length ?? 0
    for (let i = 0; i < len; i++) {
      const fdi = d.fire_danger_index?.[i] ?? null
      const windMax = d.wind_speed_10m_max?.[i] != null ? msToMph(d.wind_speed_10m_max[i]) : null
      const humMin = d.relative_humidity_2m_min?.[i] != null ? Math.round(d.relative_humidity_2m_min[i]) : null
      const precip = d.precipitation_sum?.[i] != null ? mmToIn(d.precipitation_sum[i]) : 0

      let riskLevel = 'Low'
      if (fdi !== null) {
        if (fdi >= 80) riskLevel = 'Extreme'
        else if (fdi >= 60) riskLevel = 'Very High'
        else if (fdi >= 40) riskLevel = 'High'
        else if (fdi >= 20) riskLevel = 'Moderate'
      } else if (windMax != null && humMin != null) {
        riskLevel = fireRiskFromConditions(windMax, humMin, 85)
      }

      forecast7day.push({
        date: d.time[i],
        fire_danger_index: fdi !== null ? Math.round(fdi) : null,
        wind_max_mph: windMax,
        humidity_min: humMin,
        precip_in: precip,
        risk_level: riskLevel,
      })
    }
  }

  // ── 30-day FWI history ──
  const fwiHistory30d: any[] = []
  let latestFwi: number | null = null

  if (fwiData?.daily) {
    const d = fwiData.daily
    const len = d.time?.length ?? 0
    for (let i = 0; i < len; i++) {
      const fwi = d.fire_weather_index?.[i] ?? null
      const ffmc = d.fine_fuel_moisture_code?.[i] ?? null
      const dmc = d.duff_moisture_code?.[i] ?? null
      const dc = d.drought_code?.[i] ?? null
      const isi = d.initial_spread_index?.[i] ?? null
      const bui = d.buildup_index?.[i] ?? null

      fwiHistory30d.push({
        date: d.time[i],
        fwi: fwi !== null ? Math.round(fwi * 10) / 10 : null,
        ffmc: ffmc !== null ? Math.round(ffmc * 10) / 10 : null,
        dmc: dmc !== null ? Math.round(dmc * 10) / 10 : null,
        dc: dc !== null ? Math.round(dc * 10) / 10 : null,
        isi: isi !== null ? Math.round(isi * 10) / 10 : null,
        bui: bui !== null ? Math.round(bui * 10) / 10 : null,
      })
    }
    // Most recent non-null FWI for current risk badge
    for (let i = fwiHistory30d.length - 1; i >= 0; i--) {
      if (fwiHistory30d[i].fwi !== null) {
        latestFwi = fwiHistory30d[i].fwi
        break
      }
    }
  }

  // Augment current.fire_risk with FWI if available
  if (latestFwi !== null && current.fire_risk === 'Unknown') {
    current.fire_risk = fwiToRisk(latestFwi)
  }

  return NextResponse.json(
    {
      current,
      forecast_7day: forecast7day,
      fwi_history_30d: fwiHistory30d,
      station_info: { lat, lon, source: 'Open-Meteo ERA5/Forecast' },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    },
  )
}

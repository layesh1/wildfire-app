'use client'
import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  MapPin,
  CheckCircle,
  RefreshCw,
  Navigation,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface WeatherData {
  lat: number
  lon: number
  temp_f: number
  wind_mph: number
  wind_dir: string
  humidity_pct: number
  fire_risk: string
  red_flag: boolean
}

interface FirmsPoint {
  lat: number
  lon: number
  brightness: number
  confidence: number
  frp: number
}

type AlertLevel = 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'WATCH' | 'CLEAR'

interface AlertResult {
  level: AlertLevel
  distanceKm: number
  estimatedHours: number
  windMph: number
  windDir: string
  nearestFire: FirmsPoint | null
  isMockData: boolean
}

// ── Mobility options ──────────────────────────────────────────────────────────

const MOBILITY_OPTIONS = [
  { key: 'mobile',    evacHours: 0.5,  label: 'I move quickly and have a car' },
  { key: 'elderly',   evacHours: 1.5,  label: 'I move at my own pace — might take a little longer' },
  { key: 'disabled',  evacHours: 2.0,  label: 'I need some help getting around' },
  { key: 'novehicle', evacHours: 3.0,  label: "I'll need a ride or public transit" },
  { key: 'medical',   evacHours: 4.0,  label: 'I use medical devices that need careful packing' },
] as const
type MobilityKey = typeof MOBILITY_OPTIONS[number]['key']

// ── Haversine ─────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Rothermel spread estimate ─────────────────────────────────────────────────

function estimateArrivalHours(distanceKm: number, windMph: number): number {
  const R0 = 0.75 // m/min base spread (chaparral)
  const wind_a = 0.55
  const wind_b = 1.30
  const phi_W = wind_a * Math.pow(windMph / 10, wind_b)
  const R_m_min = R0 * (1 + phi_W)
  const R_km_hr = R_m_min * 0.06
  return distanceKm / Math.max(R_km_hr, 0.01)
}

function classifyAlert(hours: number | null): AlertLevel {
  if (hours === null) return 'CLEAR'
  if (hours < 1) return 'CRITICAL'
  if (hours < 3) return 'HIGH'
  if (hours < 6) return 'ELEVATED'
  return 'WATCH'
}

// ── Alert content ─────────────────────────────────────────────────────────────

const ALERT_CONTENT: Record<AlertLevel, {
  heading: string
  subtext: string
  steps: string[]
  borderColor: string
  bgColor: string
  headingColor: string
  dotColor: string
}> = {
  CRITICAL: {
    heading: 'Head out now',
    subtext: "A fire is very close and moving toward you. Don't wait for an official notice.",
    steps: [
      'Grab your go-bag (or just your keys, phone, wallet)',
      'Close windows and doors on the way out',
      "Drive away from the fire — don't go back",
    ],
    borderColor: 'border-signal-danger',
    bgColor: 'bg-signal-danger/15',
    headingColor: 'text-signal-danger',
    dotColor: 'bg-signal-danger animate-pulse',
  },
  HIGH: {
    heading: 'Time to get ready to go',
    subtext: "A fire is in the area. You have some time, but don't delay.",
    steps: [
      'Pack your essentials now',
      'Let someone know your plan',
      'Know your route before you need it',
    ],
    borderColor: 'border-signal-warn',
    bgColor: 'bg-signal-warn/10',
    headingColor: 'text-signal-warn',
    dotColor: 'bg-signal-warn animate-pulse',
  },
  ELEVATED: {
    heading: 'A fire was spotted nearby',
    subtext: "You're not in immediate danger, but it's a good time to check your go-bag and stay aware.",
    steps: [
      'Check your go-bag',
      'Know which road you would take',
      'Keep your phone charged',
    ],
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-500/10',
    headingColor: 'text-yellow-400',
    dotColor: 'bg-yellow-400',
  },
  WATCH: {
    heading: 'Fire in the region',
    subtext: "There's a fire in your area, but you're not at risk right now. Keep an eye on updates.",
    steps: [],
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
    headingColor: 'text-blue-300',
    dotColor: 'bg-blue-400',
  },
  CLEAR: {
    heading: "You're clear",
    subtext: 'No active fires detected within 50 miles of this address.',
    steps: [],
    borderColor: 'border-signal-safe/40',
    bgColor: 'bg-signal-safe/10',
    headingColor: 'text-signal-safe',
    dotColor: 'bg-signal-safe',
  },
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 mt-6 animate-pulse">
      <div className="h-32 bg-ash-800 rounded-xl" />
      <div className="h-16 bg-ash-800 rounded-xl" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EarlyAlertPage() {
  const [address, setAddress] = useState('')
  const [monitoredAddress, setMonitoredAddress] = useState('')
  const [mobility, setMobility] = useState<MobilityKey>('mobile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AlertResult | null>(null)

  const evacHours = MOBILITY_OPTIONS.find(m => m.key === mobility)!.evacHours

  const check = useCallback(async () => {
    const target = monitoredAddress.trim() || address.trim()
    if (!target) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // 1. Get coordinates + weather
      const weatherRes = await fetch(`/api/weather?location=${encodeURIComponent(target)}`)
      if (!weatherRes.ok) {
        const j = await weatherRes.json().catch(() => ({}))
        throw new Error(j.error ?? 'Location not found')
      }
      const weather: WeatherData = await weatherRes.json()

      // 2. Get FIRMS fire points
      let firmsPoints: FirmsPoint[] = []
      let isMockData = false
      const firmsRes = await fetch('/api/fires/firms').catch(() => null)
      if (firmsRes?.ok) {
        const firmsJson = await firmsRes.json().catch(() => ({}))
        firmsPoints = Array.isArray(firmsJson?.data) ? firmsJson.data : []
      }

      // 3. Fall back to demo if FIRMS unavailable or empty
      if (firmsPoints.length === 0) {
        isMockData = true
        firmsPoints = [
          { lat: weather.lat + 0.15, lon: weather.lon + 0.15, brightness: 330, confidence: 80, frp: 45 },
        ]
      }

      // 4. Filter within 50 km + find nearest
      const nearby = firmsPoints
        .map(p => ({ ...p, km: haversineKm(weather.lat, weather.lon, p.lat, p.lon) }))
        .filter(p => p.km <= 50)
        .sort((a, b) => a.km - b.km)

      if (nearby.length === 0) {
        setResult({
          level: 'CLEAR',
          distanceKm: 0,
          estimatedHours: Infinity,
          windMph: weather.wind_mph,
          windDir: weather.wind_dir,
          nearestFire: null,
          isMockData,
        })
        return
      }

      const nearest = nearby[0]
      const windMph = weather.wind_mph ?? 10
      const estimatedHours = estimateArrivalHours(nearest.km, windMph)
      const level = classifyAlert(estimatedHours)

      setResult({
        level,
        distanceKm: nearest.km,
        estimatedHours,
        windMph,
        windDir: weather.wind_dir ?? 'N',
        nearestFire: nearest,
        isMockData,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [address, monitoredAddress])

  // ── Derived display values ──────────────────────────────────────────────────

  const leaveByText = (() => {
    if (!result || result.level === 'CLEAR' || result.level === 'WATCH') return null
    if (!isFinite(result.estimatedHours)) return null
    const leaveByH = result.estimatedHours - evacHours
    if (leaveByH <= 0) return 'already'
    const leaveByMs = leaveByH * 60 * 60 * 1000
    const leaveByDate = new Date(Date.now() + leaveByMs)
    return formatClockTime(leaveByDate)
  })()

  const fireSummary = (() => {
    if (!result || result.level === 'CLEAR' || !result.nearestFire) return null
    const miles = Math.round(result.distanceKm / 1.609)
    const windNote = result.windMph > 20
      ? 'Strong winds are pushing it in your direction.'
      : 'Wind conditions are moderate.'
    return `A fire was spotted about ${miles} ${miles === 1 ? 'mile' : 'miles'} away. ${windNote}`
  })()

  const alertContent = result ? ALERT_CONTENT[result.level] : null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <AlertTriangle className="w-4 h-4" />
          CAREGIVER &middot; EARLY ALERT
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Early Fire Alert</h1>
        <p className="text-ash-400 text-sm">Get warned before official orders</p>
      </div>

      {/* Form */}
      <div className="card p-5 mb-6 space-y-4">
        {/* Primary address */}
        <div>
          <label className="label">Your address or zip code</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none" />
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="e.g. 95003, Paradise CA, 123 Oak St Chico CA"
              className="input pl-9"
            />
          </div>
        </div>

        {/* Monitored person address */}
        <div>
          <label className="label">Monitored person&rsquo;s address (if different)</label>
          <div className="relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none" />
            <input
              type="text"
              value={monitoredAddress}
              onChange={e => setMonitoredAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="Leave blank to use your address"
              className="input pl-9"
            />
          </div>
        </div>

        {/* Mobility */}
        <div>
          <label className="label">How would you describe your situation?</label>
          <select
            value={mobility}
            onChange={e => setMobility(e.target.value as MobilityKey)}
            className="input appearance-none cursor-pointer"
          >
            {MOBILITY_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          onClick={check}
          disabled={loading || !address.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Checking&hellip;
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Check for Fires
            </>
          )}
        </button>

        {error && (
          <p className="text-signal-danger text-sm text-center">{error}</p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && <Skeleton />}

      {/* Results */}
      {!loading && result && alertContent && (
        <div className="space-y-4">
          {/* Demo mode notice */}
          {result.isMockData && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Demo mode — live fire data is temporarily unavailable. Showing an example scenario so you can see how the alert works.
            </div>
          )}

          {/* Alert banner */}
          <div className={`rounded-xl border-2 p-6 ${alertContent.borderColor} ${alertContent.bgColor}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full mt-2 shrink-0 ${alertContent.dotColor}`} />
              <div>
                <h2 className={`font-display text-2xl font-bold mb-1 ${alertContent.headingColor}`}>
                  {alertContent.heading}
                </h2>
                <p className="text-ash-200 text-sm leading-relaxed">{alertContent.subtext}</p>
              </div>
            </div>

            {/* Action steps */}
            {alertContent.steps.length > 0 && (
              <ol className="space-y-2 mt-4 pl-1">
                {alertContent.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${alertContent.borderColor} ${alertContent.headingColor} bg-ash-900/60`}>
                      {i + 1}
                    </span>
                    <span className="text-ash-100 text-sm leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Plain-language fire summary */}
          {fireSummary && (
            <div className="card p-4">
              <p className="text-ash-200 text-sm leading-relaxed">{fireSummary}</p>
            </div>
          )}

          {/* Leave-by time */}
          {leaveByText && (
            <div className="card p-4 flex items-center gap-3">
              <div className="text-ash-400 text-sm leading-relaxed">
                {leaveByText === 'already' ? (
                  <span className="text-signal-danger font-semibold">You should already be on the move.</span>
                ) : (
                  <>
                    Based on your situation, we suggest leaving by{' '}
                    <span className="text-white font-semibold">{leaveByText}</span>.
                  </>
                )}
              </div>
            </div>
          )}

          {/* Clear state */}
          {result.level === 'CLEAR' && (
            <div className="card p-6 flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-signal-safe shrink-0" />
              <div>
                <div className="text-white font-semibold mb-1">Area looks clear</div>
                <div className="text-ash-400 text-sm">
                  No fire detections within 50 miles. Conditions can change quickly — check again if the wind picks up or smoke appears.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

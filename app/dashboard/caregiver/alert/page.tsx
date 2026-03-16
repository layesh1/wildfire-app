'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  AlertTriangle,
  MapPin,
  CheckCircle,
  RefreshCw,
  Navigation,
  Users,
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

// ── Address autocomplete (Nominatim/OpenStreetMap, no API key) ─────────────────

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function AddressInput({
  value, onChange, placeholder, className = ''
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(v: string) {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length < 4) { setSuggestions([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&addressdetails=0&limit=5&countrycodes=us`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setShowDrop(data.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 400)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowDrop(true)}
        placeholder={placeholder}
        className={className}
      />
      {showDrop && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-ash-800 border border-ash-700 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map(s => (
            <li key={s.place_id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-ash-200 hover:bg-ash-700 hover:text-white transition-colors truncate"
                onMouseDown={() => { onChange(s.display_name); setSuggestions([]); setShowDrop(false) }}
              >
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
  const [monitoredAlerts, setMonitoredAlerts] = useState<{name: string; address: string; mobility: string; distanceKm: number; estimatedHours: number; windMph: number}[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsChecked, setAlertsChecked] = useState(false)

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

  const checkMonitoredPersons = useCallback(async () => {
    setAlertsLoading(true)
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('monitored_persons_v2') : null
      const persons: {name: string; address: string; mobility: string}[] = raw ? JSON.parse(raw) : []
      if (persons.length === 0) { setAlertsLoading(false); setAlertsChecked(true); return }

      const firmsRes = await fetch('/api/fires/firms').catch(() => null)
      const firmsJson = firmsRes?.ok ? await firmsRes.json().catch(() => ({})) : {}
      const firmsPoints: {lat: number; lon: number; brightness: number; confidence: number; frp: number}[] = Array.isArray(firmsJson?.data) ? firmsJson.data : []

      const results = await Promise.allSettled(persons.map(async (person) => {
        const weatherRes = await fetch(`/api/weather?location=${encodeURIComponent(person.address)}`)
        if (!weatherRes.ok) return null
        const weather = await weatherRes.json()

        let points = firmsPoints
        if (points.length === 0) {
          // demo fallback
          points = [{ lat: weather.lat + 0.1, lon: weather.lon + 0.1, brightness: 330, confidence: 80, frp: 45 }]
        }

        const nearby = points
          .map((p: {lat: number; lon: number}) => ({ ...p, km: haversineKm(weather.lat, weather.lon, p.lat, p.lon) }))
          .filter((p: {km: number}) => p.km <= 50)
          .sort((a: {km: number}, b: {km: number}) => a.km - b.km)

        if (nearby.length === 0) return null

        const nearest = nearby[0]
        const windMph = weather.wind_mph ?? 10
        const estimatedHours = estimateArrivalHours(nearest.km, windMph)

        return {
          name: person.name,
          address: person.address,
          mobility: person.mobility,
          distanceKm: nearest.km,
          estimatedHours,
          windMph,
        }
      }))

      const alerts = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
        .filter(a => a.estimatedHours < 12) // only show urgent alerts

      setMonitoredAlerts(alerts)
    } catch {}
    setAlertsLoading(false)
    setAlertsChecked(true)
  }, [])

  useEffect(() => {
    checkMonitoredPersons()
  }, [checkMonitoredPersons])

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
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none z-10" />
            <AddressInput
              value={address}
              onChange={setAddress}
              placeholder="e.g. 95003, Paradise CA, 123 Oak St Chico CA"
              className="input pl-9"
            />
          </div>
        </div>

        {/* Monitored person address */}
        <div>
          <label className="label">Monitored person&rsquo;s address (if different)</label>
          <div className="relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none z-10" />
            <AddressInput
              value={monitoredAddress}
              onChange={setMonitoredAddress}
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

      {/* Proactive alerts for monitored persons */}
      {(monitoredAlerts.length > 0 || alertsLoading) && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-white font-semibold text-sm">Proactive Alerts — Your People</h2>
          </div>
          {alertsLoading ? (
            <div className="card p-4 animate-pulse"><div className="h-4 bg-ash-800 rounded w-48" /></div>
          ) : (
            <div className="space-y-3">
              {monitoredAlerts.map((alert, i) => {
                const hoursToFront = alert.estimatedHours
                const urgency = hoursToFront < 1 ? 'CRITICAL' : hoursToFront < 3 ? 'HIGH' : 'ELEVATED'
                const miles = Math.round(alert.distanceKm / 1.609)
                return (
                  <div key={i} className={`card p-4 border-l-4 ${urgency === 'CRITICAL' ? 'border-signal-danger' : urgency === 'HIGH' ? 'border-signal-warn' : 'border-yellow-500'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${urgency === 'CRITICAL' ? 'bg-signal-danger' : urgency === 'HIGH' ? 'bg-signal-warn' : 'bg-yellow-400'}`} />
                        <span className="text-white font-semibold text-sm">{alert.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgency === 'CRITICAL' ? 'bg-signal-danger/20 text-signal-danger' : urgency === 'HIGH' ? 'bg-signal-warn/20 text-signal-warn' : 'bg-yellow-500/20 text-yellow-400'}`}>{urgency}</span>
                      </div>
                    </div>
                    <p className="text-ash-200 text-sm leading-relaxed mb-2">
                      Fire detected <strong className="text-white">{miles} {miles === 1 ? 'mile' : 'miles'}</strong> from {alert.name}&rsquo;s address.
                      {' '}Wind {alert.windMph.toFixed(0)} mph.
                      {' '}Estimated fire front: <strong className="text-white">{hoursToFront < 1 ? `${Math.round(hoursToFront * 60)} minutes` : `${hoursToFront.toFixed(1)} hours`}</strong>.
                    </p>
                    <p className="text-amber-300 text-xs leading-relaxed">
                      Official evacuation order typically takes <strong>1.1h</strong> after detection. {hoursToFront <= 1.1 ? 'Time to act is now — do not wait for an official order.' : `That means an order could come in ~${Math.max(0, hoursToFront - 1.1).toFixed(1)}h. Start preparing ${alert.name} now.`}
                    </p>
                    <div className="mt-2 text-ash-500 text-xs">{alert.address} · Mobility: {alert.mobility}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

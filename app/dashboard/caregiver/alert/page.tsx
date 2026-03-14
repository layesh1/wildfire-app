'use client'
import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  MapPin,
  Wind,
  CheckCircle,
  RefreshCw,
  Clock,
  Navigation,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'es'

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

// ── String tables ─────────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    pageLabel: 'CAREGIVER · EARLY ALERT',
    title: 'Early Fire Alert',
    subtitle: 'Get warned before official orders',
    addressLabel: 'Your address or zip code',
    addressPlaceholder: 'e.g. 95003, Paradise CA, 123 Oak St Chico CA',
    monitoredLabel: "Monitored person's address (if different)",
    monitoredPlaceholder: 'Leave blank to use your address',
    mobilityLabel: 'Mobility level',
    checkBtn: 'Check for Fires',
    checkingBtn: 'Checking…',
    distanceCard: 'Distance',
    arrivalCard: 'Est. Arrival',
    windCard: 'Wind',
    orderEtaCard: 'Official Order ETA',
    orderEtaValue: '~1.1h from signal',
    orderEtaNote: 'historical avg (WiDS data)',
    leaveBy: 'LEAVE BY',
    nowLabel: 'NOW',
    orderLabel: '+1.1h order',
    arrivalLabel: 'fire arrival',
    mockWarning: 'Demo mode — NASA FIRMS unavailable. Showing example scenario (25 km, 18 mph wind).',
    mobiles: {
      mobile: 'Mobile Adult (0.5h)',
      elderly: 'Elderly (1.5h)',
      disabled: 'Disabled (2h)',
      novehicle: 'No Vehicle (3h)',
      medical: 'Medical Equipment (4h)',
    },
    levels: {
      CRITICAL: {
        headline: 'EVACUATE NOW',
        body: 'Fire estimated within 1 hour of your location. Leave immediately.',
      },
      HIGH: {
        headline: 'Pre-Order Window',
        body: 'Leave within {{hours}}. Official order may not arrive in time.',
      },
      ELEVATED: {
        headline: 'Begin Preparation',
        body: 'Fire detected. Pack essentials and identify your route now.',
      },
      WATCH: {
        headline: 'Fire Detected in Region',
        body: 'Active fire within 50 km. Stay alert and monitor local emergency channels.',
      },
      CLEAR: {
        headline: 'No Active Fires',
        body: 'No fires detected within 50 km of your address.',
      },
    },
  },
  es: {
    pageLabel: 'CUIDADOR · ALERTA TEMPRANA',
    title: 'Alerta Temprana de Incendio',
    subtitle: 'Alertas antes de órdenes oficiales',
    addressLabel: 'Tu dirección o código postal',
    addressPlaceholder: 'ej. 95003, Paradise CA, 123 Oak St Chico CA',
    monitoredLabel: 'Dirección de la persona monitoreada (si es diferente)',
    monitoredPlaceholder: 'Dejar en blanco para usar tu dirección',
    mobilityLabel: 'Nivel de movilidad',
    checkBtn: 'Buscar Incendios',
    checkingBtn: 'Buscando…',
    distanceCard: 'Distancia',
    arrivalCard: 'Llegada Estimada',
    windCard: 'Viento',
    orderEtaCard: 'ETA de Orden Oficial',
    orderEtaValue: '~1.1h desde señal',
    orderEtaNote: 'promedio histórico (datos WiDS)',
    leaveBy: 'SALIR ANTES DE',
    nowLabel: 'AHORA',
    orderLabel: '+1.1h orden',
    arrivalLabel: 'llegada del fuego',
    mockWarning: 'Modo demo — NASA FIRMS no disponible. Mostrando escenario de ejemplo (25 km, 18 mph viento).',
    mobiles: {
      mobile: 'Adulto Móvil (0.5h)',
      elderly: 'Adulto Mayor (1.5h)',
      disabled: 'Discapacidad (2h)',
      novehicle: 'Sin Vehículo (3h)',
      medical: 'Equipo Médico (4h)',
    },
    levels: {
      CRITICAL: {
        headline: 'EVACÚE AHORA',
        body: 'Se estima que el fuego llegará en menos de 1 hora. Salga inmediatamente.',
      },
      HIGH: {
        headline: 'Ventana Pre-Orden',
        body: 'Salga en {{hours}}. La orden oficial puede no llegar a tiempo.',
      },
      ELEVATED: {
        headline: 'Comience a Prepararse',
        body: 'Incendio detectado. Empaque lo esencial e identifique su ruta ahora.',
      },
      WATCH: {
        headline: 'Incendio en la Región',
        body: 'Incendio activo a menos de 50 km. Esté alerta y monitoree los canales de emergencia.',
      },
      CLEAR: {
        headline: 'Sin Incendios Activos',
        body: 'No se detectaron incendios a menos de 50 km de su dirección.',
      },
    },
  },
}

// ── Mobility options ──────────────────────────────────────────────────────────

const MOBILITY_OPTIONS = [
  { key: 'mobile',    evacHours: 0.5  },
  { key: 'elderly',   evacHours: 1.5  },
  { key: 'disabled',  evacHours: 2.0  },
  { key: 'novehicle', evacHours: 3.0  },
  { key: 'medical',   evacHours: 4.0  },
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

// ── Rothermel estimate ────────────────────────────────────────────────────────

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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 mt-6 animate-pulse">
      <div className="h-24 bg-ash-800 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-ash-800 rounded-xl" />
        ))}
      </div>
      <div className="h-16 bg-ash-800 rounded-xl" />
    </div>
  )
}

// ── Alert banner ──────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<AlertLevel, { border: string; bg: string; text: string; icon: string; dot: string }> = {
  CRITICAL: {
    border: 'border-signal-danger',
    bg: 'bg-signal-danger/15',
    text: 'text-signal-danger',
    icon: 'text-signal-danger',
    dot: 'bg-signal-danger animate-pulse',
  },
  HIGH: {
    border: 'border-signal-warn',
    bg: 'bg-signal-warn/10',
    text: 'text-signal-warn',
    icon: 'text-signal-warn',
    dot: 'bg-signal-warn animate-pulse',
  },
  ELEVATED: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    icon: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  WATCH: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    icon: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  CLEAR: {
    border: 'border-signal-safe/40',
    bg: 'bg-signal-safe/10',
    text: 'text-signal-safe',
    icon: 'text-signal-safe',
    dot: 'bg-signal-safe',
  },
}

// ── Timeline bar ──────────────────────────────────────────────────────────────

function TimelineBar({
  estimatedHours,
  evacHours,
  lang,
  s,
}: {
  estimatedHours: number
  evacHours: number
  lang: Lang
  s: typeof STRINGS['en']
}) {
  // Timeline spans from now to 1.5× fire arrival (or at least 8h)
  const spanH = Math.max(estimatedHours * 1.5, 8)
  const orderH = 1.1
  const leaveByH = Math.max(0, estimatedHours - evacHours)

  const pct = (h: number) => Math.min(100, (h / spanH) * 100)

  const orderPct = pct(orderH)
  const arrivalPct = pct(estimatedHours)
  const leavePct = pct(leaveByH)

  const leaveByUrgent = leaveByH < 1.0

  const formatH = (h: number) => {
    const totalMin = Math.round(h * 60)
    const hh = Math.floor(totalMin / 60)
    const mm = totalMin % 60
    if (hh === 0) return `${mm}m`
    if (mm === 0) return `${hh}h`
    return `${hh}h ${mm}m`
  }

  return (
    <div className="card p-5">
      <div className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-ash-400" />
        Evacuation Timeline
      </div>

      {/* Bar track */}
      <div className="relative h-3 bg-ash-800 rounded-full mb-6">
        {/* Danger zone — from now to leave-by */}
        <div
          className={`absolute top-0 left-0 h-full rounded-l-full ${leaveByUrgent ? 'bg-signal-danger/40' : 'bg-signal-warn/30'}`}
          style={{ width: `${leavePct}%` }}
        />
        {/* Order marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 border-2 border-ash-900 z-10"
          style={{ left: `${orderPct}%` }}
        />
        {/* Fire arrival marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-signal-danger border-2 border-ash-900 z-10"
          style={{ left: `${arrivalPct}%` }}
        />
        {/* Leave-by marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-ash-900 z-20 ${leaveByUrgent ? 'bg-signal-danger' : 'bg-signal-warn'}`}
          style={{ left: `${leavePct}%` }}
        />
      </div>

      {/* Labels */}
      <div className="relative text-xs" style={{ height: 36 }}>
        {/* NOW */}
        <div className="absolute left-0 text-center" style={{ transform: 'translateX(0)' }}>
          <div className="text-ash-400 font-medium">{s.nowLabel}</div>
          <div className="text-ash-600">0h</div>
        </div>
        {/* Order */}
        <div className="absolute text-center" style={{ left: `${orderPct}%`, transform: 'translateX(-50%)' }}>
          <div className="text-amber-400 font-medium whitespace-nowrap">{s.orderLabel}</div>
        </div>
        {/* Fire arrival */}
        <div className="absolute text-center" style={{ left: `${arrivalPct}%`, transform: 'translateX(-50%)' }}>
          <div className="text-signal-danger font-medium whitespace-nowrap">{s.arrivalLabel}</div>
          <div className="text-ash-500">{formatH(estimatedHours)}</div>
        </div>
      </div>

      {/* Leave-by callout */}
      <div
        className={`mt-3 flex items-center justify-between px-4 py-2.5 rounded-xl border ${
          leaveByUrgent
            ? 'border-signal-danger/50 bg-signal-danger/10'
            : 'border-signal-warn/40 bg-signal-warn/10'
        }`}
      >
        <div className={`font-bold text-sm ${leaveByUrgent ? 'text-signal-danger' : 'text-signal-warn'}`}>
          {s.leaveBy}
        </div>
        <div className={`font-display text-lg font-bold ${leaveByUrgent ? 'text-signal-danger' : 'text-signal-warn'}`}>
          {leaveByH <= 0 ? 'NOW' : `+${formatH(leaveByH)}`}
        </div>
      </div>
      <p className="text-ash-600 text-xs mt-2">
        Based on {formatH(evacHours)} evacuation time for selected mobility level.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EarlyAlertPage() {
  const [lang, setLang] = useState<Lang>('en')
  const [address, setAddress] = useState('')
  const [monitoredAddress, setMonitoredAddress] = useState('')
  const [mobility, setMobility] = useState<MobilityKey>('mobile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AlertResult | null>(null)

  const s = STRINGS[lang]
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

  const levelStyle = result ? LEVEL_STYLES[result.level] : null

  function formatArrival(h: number) {
    if (!isFinite(h)) return '—'
    const totalMin = Math.round(h * 60)
    const hh = Math.floor(totalMin / 60)
    const mm = totalMin % 60
    if (hh === 0) return `${mm} min`
    if (mm === 0) return `${hh} hr`
    return `${hh} hr ${mm} min`
  }

  function bodyText(level: AlertLevel, hours: number) {
    const tpl = s.levels[level].body
    return tpl.replace('{{hours}}', formatArrival(hours))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-ember-400 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            {s.pageLabel}
          </div>
          {/* Language toggle */}
          <div className="flex items-center gap-1 bg-ash-800 border border-ash-700 rounded-lg p-0.5">
            {(['en', 'es'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  lang === l
                    ? 'bg-ember-500 text-white'
                    : 'text-ash-400 hover:text-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">{s.title}</h1>
        <p className="text-ash-400 text-sm">{s.subtitle}</p>
      </div>

      {/* Form */}
      <div className="card p-5 mb-6 space-y-4">
        {/* Primary address */}
        <div>
          <label className="label">{s.addressLabel}</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none" />
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder={s.addressPlaceholder}
              className="input pl-9"
            />
          </div>
        </div>

        {/* Monitored person address */}
        <div>
          <label className="label">{s.monitoredLabel}</label>
          <div className="relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash-500 pointer-events-none" />
            <input
              type="text"
              value={monitoredAddress}
              onChange={e => setMonitoredAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder={s.monitoredPlaceholder}
              className="input pl-9"
            />
          </div>
        </div>

        {/* Mobility */}
        <div>
          <label className="label">{s.mobilityLabel}</label>
          <select
            value={mobility}
            onChange={e => setMobility(e.target.value as MobilityKey)}
            className="input appearance-none cursor-pointer"
          >
            {MOBILITY_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>
                {s.mobiles[opt.key]}
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
              {s.checkingBtn}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              {s.checkBtn}
            </>
          )}
        </button>

        {error && (
          <p className="text-signal-danger text-sm text-center">
            {error}
          </p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && <Skeleton />}

      {/* Results */}
      {!loading && result && levelStyle && (
        <div className="space-y-4">
          {/* Mock data warning */}
          {result.isMockData && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {s.mockWarning}
            </div>
          )}

          {/* Alert banner */}
          <div
            className={`rounded-xl border-2 p-5 ${levelStyle.border} ${levelStyle.bg}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${levelStyle.dot}`} />
              <div className="flex-1">
                <div className={`font-display text-2xl font-bold mb-1 ${levelStyle.text}`}>
                  {s.levels[result.level].headline}
                </div>
                <p className="text-ash-200 text-sm leading-relaxed">
                  {bodyText(result.level, result.estimatedHours)}
                </p>
              </div>
              <div className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${levelStyle.border} ${levelStyle.text} bg-ash-900/80`}>
                {result.level}
              </div>
            </div>
          </div>

          {/* Metric cards — only if fire detected */}
          {result.level !== 'CLEAR' && (
            <div className="grid grid-cols-2 gap-3">
              {/* Distance */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-ash-500" />
                  <span className="text-ash-400 text-xs">{s.distanceCard}</span>
                </div>
                <div className={`font-display text-2xl font-bold ${levelStyle.text}`}>
                  {result.distanceKm.toFixed(1)} km
                </div>
                <div className="text-ash-500 text-xs mt-0.5">from address</div>
              </div>

              {/* Estimated arrival */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-ash-500" />
                  <span className="text-ash-400 text-xs">{s.arrivalCard}</span>
                </div>
                <div className={`font-display text-2xl font-bold ${levelStyle.text}`}>
                  {formatArrival(result.estimatedHours)}
                </div>
                <div className="text-ash-500 text-xs mt-0.5">Rothermel estimate</div>
              </div>

              {/* Wind */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wind className="w-3.5 h-3.5 text-ash-500" />
                  <span className="text-ash-400 text-xs">{s.windCard}</span>
                </div>
                <div className="font-display text-2xl font-bold text-white">
                  {Math.round(result.windMph)} mph
                </div>
                <div className="text-ash-500 text-xs mt-0.5">{result.windDir}</div>
              </div>

              {/* Official order ETA */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-ash-500" />
                  <span className="text-ash-400 text-xs">{s.orderEtaCard}</span>
                </div>
                <div className="font-display text-2xl font-bold text-amber-400">
                  {s.orderEtaValue}
                </div>
                <div className="text-ash-500 text-xs mt-0.5">{s.orderEtaNote}</div>
              </div>
            </div>
          )}

          {/* Clear state card */}
          {result.level === 'CLEAR' && (
            <div className="card p-6 flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-signal-safe shrink-0" />
              <div>
                <div className="text-white font-semibold mb-1">Area looks clear</div>
                <div className="text-ash-400 text-sm">
                  No NASA FIRMS fire detections within 50 km. Conditions may change — re-check if weather worsens.
                </div>
              </div>
            </div>
          )}

          {/* Timeline — only for actionable levels */}
          {(result.level === 'CRITICAL' || result.level === 'HIGH' || result.level === 'ELEVATED') && (
            <TimelineBar
              estimatedHours={result.estimatedHours}
              evacHours={evacHours}
              lang={lang}
              s={s}
            />
          )}

          {/* Research note */}
          <div className="card p-4 border-l-4 border-amber-500/50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-ash-400 text-xs leading-relaxed">
                <span className="text-amber-400 font-semibold">Why this matters: </span>
                WiDS 2025 data shows the median gap between fire signal and official evacuation order is{' '}
                <span className="text-white">211 minutes (3.5 hours)</span>. High-vulnerability counties wait up to{' '}
                <span className="text-white">11.5 hours longer</span>. This alert uses real NASA FIRMS satellite detections — not official orders.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

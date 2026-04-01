'use client'
import { useState, useEffect, useRef } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from 'recharts'
import {
  Thermometer, Wind, Droplets, Flame, Download, RefreshCw,
  AlertTriangle, Info, ChevronDown, ChevronUp, MapPin,
} from 'lucide-react'
import { ANALYST_AXIS_TICK, ANALYST_AXIS_TICK_SM } from '@/lib/analyst-charts'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CurrentConditions {
  temp_f: number | null
  humidity_pct: number | null
  wind_mph: number | null
  wind_dir: string | null
  fire_risk: string
}

interface ForecastDay {
  date: string
  fire_danger_index: number | null
  wind_max_mph: number | null
  humidity_min: number | null
  precip_in: number | null
  risk_level: string
}

interface FwiDay {
  date: string
  fwi: number | null
  ffmc: number | null
  dmc: number | null
  dc: number | null
  isi: number | null
  bui: number | null
}

interface RawsData {
  current: CurrentConditions
  forecast_7day: ForecastDay[]
  fwi_history_30d: FwiDay[]
  station_info: { lat: number; lon: number; source: string }
}

interface GeoResult {
  lat: number
  lon: number
  location: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#f59e0b',
  High: '#f97316',
  'Very High': '#ef4444',
  Extreme: '#b91c1c',
  Unknown: '#6b7280',
}

const RISK_BG: Record<string, string> = {
  Low: 'bg-green-500/10 text-green-400 border-green-500/30',
  Moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  High: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Very High': 'bg-red-500/10 text-red-400 border-red-500/30',
  Extreme: 'bg-red-900/20 text-red-300 border-red-700/50',
  Unknown: 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

function fwiColor(v: number | null): string {
  if (v === null) return '#6b7280'
  if (v >= 50) return '#b91c1c'
  if (v >= 38) return '#ef4444'
  if (v >= 25) return '#f97316'
  if (v >= 12) return '#f59e0b'
  return '#22c55e'
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return iso }
}

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(r => Object.values(r).join(',')).join('\n')
  const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── FWI component metadata ─────────────────────────────────────────────────────
const FWI_COMPONENTS = [
  {
    key: 'ffmc',
    label: 'FFMC',
    fullName: 'Fine Fuel Moisture Code',
    max: 101,
    critical: 87,
    description: 'Moisture of fine surface fuels (litter, grass). Higher = drier surface fuels. Critical threshold: >87.',
    operationalNote: '>87: high fire spread risk from surface fine fuels',
  },
  {
    key: 'dmc',
    label: 'DMC',
    fullName: 'Duff Moisture Code',
    max: 200,
    critical: 30,
    description: 'Moisture in loosely compacted, decomposing organic material. Higher = drier intermediate-depth fuels.',
    operationalNote: '>30: moderate fire spread; >60: smoldering risk',
  },
  {
    key: 'dc',
    label: 'DC',
    fullName: 'Drought Code',
    max: 1000,
    critical: 300,
    description: 'Moisture of deep, compact organic layers. Reflects seasonal drought. Higher = severe deep soil dryness.',
    operationalNote: '>300: severe drought; >500: deep smoldering & spotting risk',
  },
  {
    key: 'isi',
    label: 'ISI',
    fullName: 'Initial Spread Index',
    max: 25,
    critical: 10,
    description: 'Expected rate of fire spread. Combines FFMC with wind speed. Higher = faster spread.',
    operationalNote: '>10: rapid fire spread expected',
  },
  {
    key: 'bui',
    label: 'BUI',
    fullName: 'Buildup Index',
    max: 200,
    critical: 40,
    description: 'Amount of fuel available for combustion. Combines DMC + DC.',
    operationalNote: '>40: significant fuel accumulation; >80: extreme buildup',
  },
  {
    key: 'fwi',
    label: 'FWI',
    fullName: 'Fire Weather Index',
    max: 100,
    critical: 25,
    description: 'Overall fire danger rating. Combines ISI + BUI. The primary headline number.',
    operationalNote: '0–12 Low · 12–25 Moderate · 25–38 High · 38–50 Very High · 50+ Extreme',
  },
]

// ── FWI Tooltip with info ──────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:text-gray-300 ml-1 transition-colors"
        aria-label="More info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 text-xs text-gray-800 dark:text-gray-300 shadow-xl leading-relaxed">
          {text}
        </span>
      )}
    </span>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg ${className}`} />
}

// ── Custom chart tooltips ──────────────────────────────────────────────────────
function FwiTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg text-gray-300">
      <p className="text-gray-600 dark:text-gray-400 mb-1">{fmtDate(label)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.name}: {p.value ?? '—'}
        </p>
      ))}
    </div>
  )
}

function FwiBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const comp = FWI_COMPONENTS.find(c => c.label === label)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-xs shadow-lg max-w-xs text-gray-300">
      <p className="text-white font-semibold mb-1">{comp?.fullName ?? label}</p>
      <p className="text-gray-600 dark:text-gray-400 mb-1.5">{comp?.description}</p>
      <p style={{ color: '#f04a00' }} className="font-mono font-bold">Value: {payload[0]?.value ?? '—'}</p>
      <p className="text-gray-500 dark:text-gray-500 mt-1 border-t border-gray-200 dark:border-gray-800 pt-1">{comp?.operationalNote}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FireWeatherPage() {
  const [locationInput, setLocationInput] = useState('Paradise, CA')
  const [locationDisplay, setLocationDisplay] = useState('Paradise, CA (39.76°N, 121.62°W)')
  const [coords, setCoords] = useState({ lat: 39.7596, lon: -121.6219 })
  const [data, setData] = useState<RawsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(false)
  const fetchedRef = useRef(false)

  // Fetch fire weather data
  async function fetchRaws(lat: number, lon: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/fires/raws?lat=${lat}&lon=${lon}`)
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const json: RawsData = await res.json()
      setData(json)
    } catch (err: any) {
      console.error('RAWS fetch failed:', err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchRaws(coords.lat, coords.lon)
  }, [])

  // Geocode + re-fetch on location search
  async function handleSearch() {
    setGeoError(null)
    if (!locationInput.trim()) return

    // Check if raw coords entered e.g. "39.76, -121.62"
    const coordMatch = locationInput.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1])
      const lon = parseFloat(coordMatch[2])
      setCoords({ lat, lon })
      setLocationDisplay(`${locationInput.trim()} (${lat.toFixed(2)}°N, ${Math.abs(lon).toFixed(2)}°W)`)
      fetchRaws(lat, lon)
      return
    }

    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(locationInput.trim())}`)
      if (!res.ok) {
        setGeoError('Location not found. Try "City, State" or lat,lon coordinates.')
        return
      }
      const geo: GeoResult = await res.json()
      setCoords({ lat: geo.lat, lon: geo.lon })
      const name = geo.location || locationInput.trim()
      setLocationDisplay(`${name} (${geo.lat.toFixed(2)}°N, ${Math.abs(geo.lon).toFixed(2)}°W)`)
      fetchRaws(geo.lat, geo.lon)
    } catch {
      setGeoError('Geocoding service unavailable. Try lat,lon format.')
    }
  }

  // Derive latest FWI day for component bar chart
  const latestFwiDay = data?.fwi_history_30d
    ? [...data.fwi_history_30d].reverse().find(d => d.fwi !== null)
    : null

  const fwiBarData = latestFwiDay
    ? FWI_COMPONENTS.map(c => ({
        label: c.label,
        value: latestFwiDay[c.key as keyof FwiDay] as number | null,
        max: c.max,
        critical: c.critical,
      }))
    : []

  // Avg FWI for fuel moisture interpretation
  const avgFwi = data?.fwi_history_30d
    ? (() => {
        const vals = data.fwi_history_30d.filter(d => d.fwi !== null).map(d => d.fwi as number)
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      })()
    : null

  // Fuel trend: compare first 15 vs last 15 days
  const fuelTrend = data?.fwi_history_30d
    ? (() => {
        const valid = data.fwi_history_30d.filter(d => d.ffmc !== null)
        if (valid.length < 2) return 'unknown'
        const mid = Math.floor(valid.length / 2)
        const early = valid.slice(0, mid).reduce((a, d) => a + (d.ffmc ?? 0), 0) / mid
        const late = valid.slice(mid).reduce((a, d) => a + (d.ffmc ?? 0), 0) / (valid.length - mid)
        return late > early + 2 ? 'drying' : late < early - 2 ? 'moistening' : 'stable'
      })()
    : 'unknown'

  const riskColor = RISK_COLORS[data?.current.fire_risk ?? 'Unknown']
  const riskBg = RISK_BG[data?.current.fire_risk ?? 'Unknown']

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-gray-700 dark:text-gray-300">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">
            <Thermometer className="w-4 h-4 text-ember-400" />
            FIRE SCIENCE · RESEARCH TOOL
          </div>
          <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Fire Weather &amp; Fuel Moisture Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base max-w-2xl">
            FWI component breakdown, 30-day historical trend, and 7-day forecast — powered by ERA5 reanalysis data.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-medium shrink-0">
          Open-Meteo ERA5 + Forecast
        </span>
      </div>

      {/* ── Location search ── */}
      <div className="card p-5">
        <label className="block text-gray-600 dark:text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">
          Location
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-500" />
            <input
              type="text"
              value={locationInput}
              onChange={e => setLocationInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="City, State or lat,lon"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-ember-500/60 placeholder:text-gray-600 dark:text-gray-400"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-ember-500 hover:bg-ember-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Fetch Data
          </button>
        </div>
        {geoError && (
          <p className="text-signal-danger text-xs mt-2">{geoError}</p>
        )}
        {!geoError && (
          <p className="text-gray-500 dark:text-gray-500 text-xs mt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Using: {locationDisplay}
          </p>
        )}
      </div>

      {/* ── Current Conditions ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Temperature */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs mb-3">
              <Thermometer className="w-3.5 h-3.5" /> Temperature
            </div>
            <div className="font-display text-3xl font-bold text-gray-900 dark:text-white">
              {data?.current.temp_f != null ? `${data.current.temp_f}°F` : '—'}
            </div>
          </div>

          {/* Humidity */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs mb-3">
              <Droplets className="w-3.5 h-3.5" /> Humidity
            </div>
            <div className={`font-display text-3xl font-bold ${(data?.current.humidity_pct ?? 100) < 15 ? 'text-signal-danger' : 'text-gray-900 dark:text-white'}`}>
              {data?.current.humidity_pct != null ? `${data.current.humidity_pct}%` : '—'}
            </div>
            {(data?.current.humidity_pct ?? 100) < 15 && (
              <p className="text-signal-danger text-xs mt-1">Critical — below 15%</p>
            )}
          </div>

          {/* Wind */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs mb-3">
              <Wind className="w-3.5 h-3.5" /> Wind
            </div>
            <div className="font-display text-3xl font-bold text-gray-900 dark:text-white">
              {data?.current.wind_mph != null ? `${data.current.wind_mph}` : '—'}
              <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-1">mph</span>
            </div>
            {data?.current.wind_dir && (
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{data.current.wind_dir}</p>
            )}
          </div>

          {/* Fire Risk */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs mb-3">
              <Flame className="w-3.5 h-3.5" /> Fire Risk
            </div>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-semibold ${riskBg}`}>
              {data?.current.fire_risk ?? 'Unknown'}
            </span>
          </div>

          {/* FWI Today */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs mb-3">
              <AlertTriangle className="w-3.5 h-3.5" /> FWI Today
            </div>
            <div className="font-display text-3xl font-bold" style={{ color: fwiColor(latestFwiDay?.fwi ?? null) }}>
              {latestFwiDay?.fwi != null ? latestFwiDay.fwi : '—'}
            </div>
            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">{data?.current.fire_risk ?? '—'}</p>
          </div>
        </div>
      )}

      {/* ── FWI Components ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1">FWI Components</h2>
            <p className="text-gray-500 dark:text-gray-500 text-xs">
              Most recent day · {latestFwiDay?.date ? fmtDate(latestFwiDay.date) : '—'} · Hover bars for operational thresholds
            </p>
          </div>
          <button
            onClick={() => setShowLegend(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showLegend ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Legend
          </button>
        </div>

        {loading ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4">
              {FWI_COMPONENTS.map(c => (
                <span key={c.key} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <strong className="text-gray-800 dark:text-gray-200">{c.label}</strong> {c.fullName}
                  <InfoTooltip text={c.description} />
                </span>
              ))}
            </div>

            {fwiBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fwiBarData} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={ANALYST_AXIS_TICK} />
                  <YAxis type="category" dataKey="label" tick={{ ...ANALYST_AXIS_TICK, fontSize: 12, fontWeight: 600 }} width={46} />
                  <Tooltip content={<FwiBarTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {fwiBarData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.value !== null && d.value > d.critical
                            ? '#ef4444'
                            : d.value !== null && d.value > d.critical * 0.7
                              ? '#f59e0b'
                              : '#22c55e'
                        }
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-500 text-sm">
                No FWI component data available for this location.
              </div>
            )}
          </>
        )}

        {/* Legend table */}
        {showLegend && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                  <th className="text-left py-1.5 pr-4 font-medium">Index</th>
                  <th className="text-left py-1.5 pr-4 font-medium">Critical Threshold</th>
                  <th className="text-left py-1.5 font-medium">Operational Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {FWI_COMPONENTS.map(c => (
                  <tr key={c.key}>
                    <td className="py-2 pr-4 text-gray-900 dark:text-white font-semibold">{c.label}</td>
                    <td className="py-2 pr-4 text-signal-warn font-mono">{c.critical}+</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{c.operationalNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-2">
              DC &gt; 300 = severe drought condition, high probability of smoldering. DC &gt; 500 = long-term drought, deep layer combustion possible.
            </p>
          </div>
        )}
      </div>

      {/* ── 30-day FWI trend ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Fire Weather Index — 30 Day Trend</h2>
          {data?.fwi_history_30d && data.fwi_history_30d.length > 0 && (
            <button
              onClick={() => downloadCSV(data.fwi_history_30d, `fwi-data-${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}.csv`)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-800 dark:text-gray-200"
            >
              <Download className="w-4 h-4" /> Export FWI Data (CSV)
            </button>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-500 text-xs mb-4">ERA5 reanalysis · FWI (solid) and BUI (dashed) overlay</p>

        {/* Risk level reference bands legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { label: 'Low (0–12)', color: '#22c55e' },
            { label: 'Moderate (12–25)', color: '#f59e0b' },
            { label: 'High (25–38)', color: '#f97316' },
            { label: 'Very High (38–50)', color: '#ef4444' },
            { label: 'Extreme (50+)', color: '#b91c1c' },
          ].map(b => (
            <span key={b.label} className="text-xs flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <span className="inline-block w-3 h-2 rounded-sm" style={{ background: b.color, opacity: 0.7 }} />
              {b.label}
            </span>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : data?.fwi_history_30d && data.fwi_history_30d.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.fwi_history_30d} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={ANALYST_AXIS_TICK_SM}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 'auto']}
                tick={ANALYST_AXIS_TICK}
                width={36}
              />
              <Tooltip content={<FwiTrendTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#6b7280' }}
                formatter={(v) => v === 'fwi' ? 'FWI' : 'BUI'}
              />
              {/* Reference bands as horizontal lines */}
              <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={25} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={38} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={50} stroke="#b91c1c" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Line
                type="monotone"
                dataKey="fwi"
                name="fwi"
                stroke="#f04a00"
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="bui"
                name="bui"
                stroke="#6366f1"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-500 text-sm">
            30-day FWI history not available for this location.
          </div>
        )}
      </div>

      {/* ── 7-day forecast table ── */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1">7-Day Fire Weather Forecast</h2>
        <p className="text-gray-500 dark:text-gray-500 text-xs mb-4">Open-Meteo numerical weather forecast · Red rows = fire danger index &gt; 60</p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : data?.forecast_7day && data.forecast_7day.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                  {['Date', 'Fire Danger Index', 'Max Wind', 'Min Humidity', 'Precip', 'Risk Level'].map(h => (
                    <th key={h} className="px-4 py-3 text-gray-500 dark:text-gray-500 text-xs font-medium uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {data.forecast_7day.map((row, i) => {
                  const highRisk = (row.fire_danger_index ?? 0) > 60
                  return (
                    <tr key={i} className={`transition-colors ${highRisk ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800/30'}`}>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold" style={{ color: fwiColor(row.fire_danger_index) }}>
                          {row.fire_danger_index ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-300 font-mono">
                        {row.wind_max_mph != null ? `${row.wind_max_mph} mph` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono ${(row.humidity_min ?? 100) < 15 ? 'text-signal-danger' : 'text-gray-800 dark:text-gray-300'}`}>
                          {row.humidity_min != null ? `${row.humidity_min}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">
                        {row.precip_in != null ? `${row.precip_in}"` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_BG[row.risk_level] ?? RISK_BG.Unknown}`}>
                          {row.risk_level}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-gray-500 dark:text-gray-500 text-sm">
            Forecast data not available.
          </div>
        )}
      </div>

      {/* ── Fuel Moisture Interpretation ── */}
      <div className="card p-6">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4">Fuel Moisture Interpretation</h2>

        {avgFwi !== null && avgFwi > 50 && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-300 text-sm">
              <strong>Critical fire weather pattern</strong> — the 30-day average FWI of {avgFwi.toFixed(1)} indicates a sustained dry fuel period exceeding 30 days.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Fuel classes */}
          <div>
            <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-sm mb-3">Fuel Time-Lag Classes</h3>
            <div className="space-y-3">
              {[
                { label: '1-Hour fuels', example: 'Grass, needles, small twigs', desc: 'Respond to humidity changes within hours. Dry out rapidly on hot, windy days.' },
                { label: '10-Hour fuels', example: 'Small branches (0.25–1")', desc: 'Equilibrate over about 10 hours. Key in fire behavior models.' },
                { label: '100-Hour fuels', example: 'Large branches (1–3")', desc: 'Take days to dry or rehydrate. Important for intensity and residual smoldering.' },
                { label: '1000-Hour fuels', example: 'Logs >3" diameter', desc: 'Require weeks to months. DC index reflects these. High DC → deep smoldering.' },
              ].map(f => (
                <div key={f.label} className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-900 dark:text-white text-xs font-semibold">{f.label} <span className="text-gray-500 dark:text-gray-500 font-normal">({f.example})</span></p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Current trend */}
          <div>
            <h3 className="text-gray-800 dark:text-gray-200 font-semibold text-sm mb-3">Current Conditions Assessment</h3>
            <div className="space-y-3">
              <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">1-hour fuels (FFMC trend)</p>
                <p className="text-gray-900 dark:text-white text-sm">
                  Currently{' '}
                  <span className={
                    fuelTrend === 'drying' ? 'text-signal-danger font-semibold' :
                    fuelTrend === 'moistening' ? 'text-signal-safe font-semibold' :
                    'text-gray-800 dark:text-gray-300'
                  }>
                    {fuelTrend === 'drying' ? 'drying' : fuelTrend === 'moistening' ? 'moistening' : 'stable'}
                  </span>
                  {' '}based on recent FFMC trend.
                  {fuelTrend === 'drying' && (
                    <span className="text-gray-600 dark:text-gray-400"> Surface fuels are drying — fire spread risk increasing.</span>
                  )}
                  {fuelTrend === 'moistening' && (
                    <span className="text-gray-600 dark:text-gray-400"> Surface fuels are gaining moisture — reduced spread risk.</span>
                  )}
                </p>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Deep fuels (DC)</p>
                <p className="text-gray-900 dark:text-white text-sm">
                  DC ={' '}
                  <span className={`font-mono font-bold ${(latestFwiDay?.dc ?? 0) > 300 ? 'text-signal-danger' : (latestFwiDay?.dc ?? 0) > 150 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                    {latestFwiDay?.dc ?? '—'}
                  </span>
                  {latestFwiDay?.dc != null && latestFwiDay.dc > 300 && (
                    <span className="text-signal-danger text-xs ml-2">&gt;300 = severe drought condition</span>
                  )}
                </p>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">30-day avg FWI</p>
                <p className="font-mono font-bold text-xl" style={{ color: fwiColor(avgFwi) }}>
                  {avgFwi?.toFixed(1) ?? '—'}
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                  {avgFwi === null ? 'Data unavailable'
                    : avgFwi >= 50 ? 'Extreme: sustained critical conditions'
                    : avgFwi >= 38 ? 'Very High: prolonged fire weather'
                    : avgFwi >= 25 ? 'High: elevated seasonal danger'
                    : avgFwi >= 12 ? 'Moderate: normal fire season levels'
                    : 'Low: minimal fire danger period'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer attribution */}
      <p className="text-gray-600 dark:text-gray-400 text-xs text-center pb-4">
        Data: Open-Meteo ERA5 climate reanalysis + NWP forecast model · {data?.station_info.source ?? ''} · Free, no API key required
      </p>
    </div>
  )
}

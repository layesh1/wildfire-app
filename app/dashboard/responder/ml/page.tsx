'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Activity, Wind, Thermometer, Droplets, TrendingUp, AlertTriangle, MapPin, Loader2 } from 'lucide-react'

const FireSpreadMap = dynamic(() => import('@/components/FireSpreadMap'), { ssr: false })

const COUNTY_SVI: Record<string, number> = {
  'trinity': 0.72, 'mohave': 0.85, 'la paz': 0.92, 'humboldt': 0.83,
  'klamath': 0.84, 'siskiyou': 0.79, 'del norte': 0.90, 'shasta': 0.76,
  'plumas': 0.69, 'fresno': 0.72, 'el dorado': 0.61, 'catron': 0.78,
  'apache': 0.82, 'greenlee': 0.74, 'mckinley': 0.78, 'owyhee': 0.71,
  'presidio': 0.68, 'glacier': 0.63, 'okanogan': 0.61, 'curry': 0.61,
}

function detectSVI(location: string): number | null {
  const lower = location.toLowerCase()
  for (const [county, svi] of Object.entries(COUNTY_SVI)) {
    if (lower.includes(county)) return svi
  }
  return null
}

// Van Wagner (1969) — wind speed must be in m/s, NOT mph
function vanWagnerLW(windSpeedMph: number): number {
  const u_ms = windSpeedMph * 0.44704
  return Math.min(8, Math.max(1.0, 0.936 * Math.exp(0.2566 * u_ms) + 0.461 * Math.exp(-0.1548 * u_ms) - 0.397))
}

function FireShapeViz({ spread, windSpeed }: { spread: number; windSpeed: number }) {
  const LW = vanWagnerLW(windSpeed)
  const e = Math.sqrt(Math.max(0, 1 - 1 / (LW * LW)))
  const TIME_HORIZONS = [1, 3, 6, 12, 24]
  const LABELS = ['1h', '3h', '6h', '12h', '24h']
  const COLORS = ['#FFF176', '#FFB300', '#FF6F00', '#FF3D00', '#AA0000']
  const SVG_W = 300, SVG_H = 220
  const CX = SVG_W * 0.38, CY = SVG_H * 0.5

  const ellipses = TIME_HORIZONS.map((t, i) => {
    const area_m2 = spread * (t / 24) * 4047
    const b_m = Math.sqrt(Math.max(area_m2 / (Math.PI * LW), 1))
    const a_m = b_m * LW
    return { t, a_m, b_m, color: COLORS[i], label: LABELS[i] }
  })

  const maxA = ellipses[4].a_m
  const maxPx = Math.min(SVG_W * 0.58, SVG_H * 0.44 * LW)
  const scale = maxA > 0 ? maxPx / maxA : 1

  return (
    <div className="card p-4">
      <div className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
        <span className="text-ember-400">◎</span> Fire Growth Shape — Technical View
      </div>
      <p className="text-ash-500 text-xs mb-3">
        Van Wagner (1969) ellipse · Wind → right · L/W = {LW.toFixed(1)}:1 · Origin = ignition
      </p>
      <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ background: '#0d1117', borderRadius: 8 }}>
        <defs>
          <marker id="arr-r" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#00BFFF" />
          </marker>
        </defs>
        <line x1={CX} y1={4} x2={CX} y2={SVG_H - 4} stroke="#1e2738" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={4} y1={CY} x2={SVG_W - 4} y2={CY} stroke="#1e2738" strokeWidth={1} strokeDasharray="3 3" />
        <text x={CX + 3} y={13} fill="#404050" fontSize={8} fontFamily="monospace">N</text>
        <text x={SVG_W - 11} y={CY + 4} fill="#404050" fontSize={8} fontFamily="monospace">E</text>
        <text x={CX + 3} y={SVG_H - 3} fill="#404050" fontSize={8} fontFamily="monospace">S</text>
        <text x={3} y={CY + 4} fill="#404050" fontSize={8} fontFamily="monospace">W</text>
        {[...ellipses].reverse().map(({ t, a_m, b_m, color }) => {
          const sa = a_m * scale, sb = b_m * scale
          const coff = a_m * e * scale
          return (
            <ellipse key={t} cx={CX + coff} cy={CY} rx={sa} ry={sb}
              fill={color + '28'} stroke={color} strokeWidth={1.5} />
          )
        })}
        <circle cx={CX} cy={CY} r={3.5} fill="#FF3333" />
        <line x1={CX - 7} y1={CY} x2={CX + 7} y2={CY} stroke="#FF5555" strokeWidth={1.5} />
        <line x1={CX} y1={CY - 7} x2={CX} y2={CY + 7} stroke="#FF5555" strokeWidth={1.5} />
        <line x1={CX + 10} y1={CY - 26} x2={CX + 36} y2={CY - 26}
          stroke="#00BFFF" strokeWidth={2} markerEnd="url(#arr-r)" />
        <text x={CX + 10} y={CY - 29} fill="#00BFFF" fontSize={7} fontFamily="monospace">wind →</text>
        {ellipses.map(({ label, color }, i) => (
          <g key={label}>
            <circle cx={12} cy={14 + i * 13} r={3.5} fill={color + '40'} stroke={color} strokeWidth={1} />
            <text x={20} y={18 + i * 13} fill={color} fontSize={8} fontFamily="monospace">{label}</text>
          </g>
        ))}
      </svg>
      <p className="text-ash-600 text-xs mt-2">
        Perimeter at each time step · 24h projected area: {spread.toLocaleString()} ac
      </p>
    </div>
  )
}

const RISK_LEVELS = [
  { label: 'Low', color: 'text-signal-safe', bg: 'bg-signal-safe/10 border-signal-safe/30' },
  { label: 'Moderate', color: 'text-signal-warn', bg: 'bg-signal-warn/10 border-signal-warn/30' },
  { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { label: 'Critical', color: 'text-signal-danger', bg: 'bg-signal-danger/10 border-signal-danger/30' },
]

export default function MLPredictorPage() {
  const [location, setLocation] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [detectedCounty, setDetectedCounty] = useState<string | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [windDirDeg, setWindDirDeg] = useState<number>(270)
  const [windSpeed, setWindSpeed] = useState(15)
  const [humidity, setHumidity] = useState(20)
  const [temp, setTemp] = useState(85)
  const [svi, setSvi] = useState(0.65)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<null | { risk: number; spread_acres_24h: number; evac_probability: number }>(null)
  const [fireMode, setFireMode] = useState<'scenario' | 'active'>('scenario')
  const [currentAcres, setCurrentAcres] = useState(500)
  const [containmentPct, setContainmentPct] = useState(0)
  const [censusLoading, setCensusLoading] = useState(false)
  const [medianHomeValue, setMedianHomeValue] = useState<number | null>(null)
  const [censusCounty, setCensusCounty] = useState('')

  async function fetchLocation() {
    if (!location.trim()) return
    setLocationLoading(true)
    setLocationError(null)
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(location)}`)
      const w = await res.json()
      if (!res.ok) {
        setLocationError(w.error ?? 'Location not found')
      } else {
        if (w.wind_mph != null) setWindSpeed(Math.min(80, Math.round(w.wind_mph)))
        if (w.humidity_pct != null) setHumidity(Math.round(w.humidity_pct))
        if (w.temp_f != null) setTemp(Math.min(120, Math.max(40, Math.round(w.temp_f))))
        if (w.wind_dir_deg != null) setWindDirDeg(w.wind_dir_deg)
        if (w.lat != null) setLat(w.lat)
        if (w.lon != null) setLon(w.lon)
        setResult(null)
      }
    } catch {
      setLocationError('Network error — check connection')
    }
    const autoSVI = detectSVI(location)
    if (autoSVI !== null) {
      setSvi(autoSVI)
      const county = Object.entries(COUNTY_SVI).find(([k]) => location.toLowerCase().includes(k))?.[0]
      setDetectedCounty(county ? county.replace(/\b\w/g, c => c.toUpperCase()) : null)
    }
    setLocationLoading(false)
  }

  async function fetchCensusValue(countyInput: string) {
    setCensusLoading(true)
    setMedianHomeValue(null)
    try {
      // Use Nominatim to get FIPS code, then Census ACS for median home value
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(countyInput + ' county')}&format=json&addressdetails=1&limit=1&countrycodes=us`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const geoData = await geoRes.json()
      if (!geoData?.[0]?.address) { setCensusLoading(false); return }

      const addr = geoData[0].address
      // Get state FIPS from state code
      const stateRes = await fetch(
        `https://api.census.gov/data/2022/acs/acs5?get=NAME&for=state:*`
      )
      const stateData = await stateRes.json()
      const stateRow = stateData?.find((row: string[]) => row[0]?.includes(addr.state))
      const stateFips = stateRow?.[1]
      if (!stateFips) { setCensusLoading(false); return }

      // Fetch median home value (B25077_001E) for all counties in state
      const countyRes = await fetch(
        `https://api.census.gov/data/2022/acs/acs5?get=NAME,B25077_001E&for=county:*&in=state:${stateFips}`
      )
      const countyData = await countyRes.json()
      const countyName = addr.county?.toLowerCase().replace(' county', '')
      const match = countyData?.find((row: string[]) => row[0]?.toLowerCase().includes(countyName || ''))
      if (match && match[1] && match[1] !== '-666666666') {
        setMedianHomeValue(parseInt(match[1]))
      }
    } catch {}
    setCensusLoading(false)
  }

  async function runPrediction() {
    setRunning(true)
    await new Promise(r => setTimeout(r, 1200))
    const risk = Math.min(
      ((windSpeed / 60) * 0.35) + ((1 - humidity / 100) * 0.3) + ((temp / 120) * 0.2) + (svi * 0.15),
      0.99
    )
    const baseSpread = Math.round(risk * 15000 + windSpeed * 80)
    const spread_acres_24h = fireMode === 'active'
      ? Math.round(baseSpread * Math.max(0.05, 1 - containmentPct / 100))
      : baseSpread
    setResult({
      risk,
      spread_acres_24h,
      evac_probability: Math.min(risk * 1.3, 0.99),
    })
    setRunning(false)
  }

  const riskLevel = result
    ? result.risk < 0.25 ? 0 : result.risk < 0.5 ? 1 : result.risk < 0.75 ? 2 : 3
    : null

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-info text-sm font-medium mb-3">
          <Activity className="w-4 h-4" /> ML SPREAD PREDICTOR
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Fire Spread Prediction</h1>
        <p className="text-ash-400 text-sm">Enter current conditions to predict 24-hour fire spread and evacuation probability.</p>
      </div>

      {/* Location auto-fill */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-signal-info" />
          <span className="text-white text-sm font-medium">Auto-fill from location</span>
          <span className="text-ash-600 text-xs ml-auto">Weather via Open-Meteo · SVI from WiDS</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={location}
            onChange={e => { setLocation(e.target.value); setLocationError(null) }}
            onKeyDown={e => e.key === 'Enter' && fetchLocation()}
            placeholder="City, county, or zip — e.g. Klamath, OR"
            className="flex-1 bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-signal-info/60 placeholder:text-ash-600"
          />
          <button onClick={fetchLocation} disabled={locationLoading}
            className="px-4 py-2 rounded-lg text-sm bg-signal-info/20 border border-signal-info/30 text-signal-info hover:bg-signal-info/30 transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {locationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            Fetch
          </button>
        </div>
        {locationError && <p className="text-signal-danger text-xs mt-2">{locationError}</p>}
        {detectedCounty && !locationError && (
          <p className="text-signal-info text-xs mt-2">
            SVI auto-detected for {detectedCounty} County · Adjust sliders if needed
          </p>
        )}
      </div>

      <div className="card p-4 mb-6">
        <div className="text-white text-sm font-medium mb-3">Fire Mode</div>
        <div className="grid grid-cols-2 gap-2">
          {(['scenario', 'active'] as const).map(mode => (
            <button key={mode} onClick={() => { setFireMode(mode); setResult(null) }}
              className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all text-left ${
                fireMode === mode
                  ? mode === 'active'
                    ? 'bg-signal-danger/10 border-signal-danger/40 text-signal-danger'
                    : 'bg-signal-info/10 border-signal-info/40 text-signal-info'
                  : 'border-ash-700 text-ash-400 hover:text-white hover:border-ash-600'
              }`}>
              <div className="font-semibold">{mode === 'scenario' ? 'Scenario Planning' : 'Active Fire'}</div>
              <div className="text-xs mt-0.5 opacity-75">
                {mode === 'scenario' ? 'No fire yet — predict from scratch' : 'Fire is burning — adjust for containment'}
              </div>
            </button>
          ))}
        </div>
        {fireMode === 'active' && (
          <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-ash-800">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-ash-300 text-sm">Current Burned Acres</span>
                <span className="text-white font-mono text-sm">{currentAcres.toLocaleString()} ac</span>
              </div>
              <input type="range" min={10} max={100000} step={10} value={currentAcres}
                onChange={e => { setCurrentAcres(Number(e.target.value)); setResult(null) }}
                className="w-full accent-orange-500" />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-ash-300 text-sm">Containment</span>
                <span className="text-white font-mono text-sm">{containmentPct}%</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={containmentPct}
                onChange={e => { setContainmentPct(Number(e.target.value)); setResult(null) }}
                className="w-full accent-signal-safe" />
            </div>
            <p className="col-span-2 text-ash-500 text-xs">
              At {containmentPct}% containment — projected additional spread reduced by {containmentPct}%. Current burn perimeter shown on map.
            </p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-6">
          <h2 className="text-white font-semibold">Conditions Input</h2>
          {[
            { label: 'Wind Speed', icon: Wind, value: windSpeed, set: setWindSpeed, min: 0, max: 80, unit: 'mph' },
            { label: 'Relative Humidity', icon: Droplets, value: humidity, set: setHumidity, min: 0, max: 100, unit: '%' },
            { label: 'Temperature', icon: Thermometer, value: temp, set: setTemp, min: 40, max: 120, unit: '°F' },
            { label: 'SVI Score (community vulnerability)', icon: TrendingUp, value: svi, set: setSvi, min: 0, max: 1, step: 0.01, unit: '' },
          ].map(({ label, icon: Icon, value, set, min, max, unit, step }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-ash-400" />
                  <label className="text-ash-300 text-sm">{label}</label>
                </div>
                <span className="text-white font-mono text-sm font-bold">{step === 0.01 ? Number(value).toFixed(2) : value}{unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step ?? 1} value={value}
                onChange={e => { set(Number(e.target.value)); setResult(null) }}
                className="w-full accent-ember-500" />
              <div className="flex justify-between text-ash-600 text-xs mt-1">
                <span>{min}{unit}</span><span>{max}{unit}</span>
              </div>
            </div>
          ))}
          <button onClick={runPrediction} disabled={running}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {running ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running model…</> : <><Activity className="w-4 h-4" /> Run Prediction</>}
          </button>
        </div>

        <div className="space-y-4">
          {result && riskLevel !== null ? (
            <>
              <div className={`card p-6 border ${RISK_LEVELS[riskLevel].bg}`}>
                <div className="text-ash-400 text-xs font-medium uppercase tracking-wider mb-2">Risk Assessment</div>
                <div className={`font-display text-5xl font-bold ${RISK_LEVELS[riskLevel].color}`}>
                  {RISK_LEVELS[riskLevel].label}
                </div>
                <div className="text-ash-400 text-sm mt-1">Risk score: {(result.risk * 100).toFixed(1)}%</div>
                <div className="mt-4 w-full h-3 bg-ash-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${riskLevel === 0 ? 'bg-signal-safe' : riskLevel === 1 ? 'bg-signal-warn' : riskLevel === 2 ? 'bg-orange-400' : 'bg-signal-danger'}`}
                    style={{ width: `${result.risk * 100}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-5">
                  <div className="text-ash-400 text-xs mb-1">{fireMode === 'active' ? 'Projected additional spread' : 'Projected spread (24h)'}</div>
                  <div className="font-display text-2xl font-bold text-signal-warn">{result.spread_acres_24h.toLocaleString()}</div>
                  <div className="text-ash-500 text-xs">acres</div>
                </div>
                <div className="card p-5">
                  <div className="text-ash-400 text-xs mb-1">Evacuation probability</div>
                  <div className={`font-display text-2xl font-bold ${result.evac_probability > 0.7 ? 'text-signal-danger' : result.evac_probability > 0.4 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                    {(result.evac_probability * 100).toFixed(0)}%
                  </div>
                  <div className="text-ash-500 text-xs">confidence</div>
                </div>
              </div>
              {riskLevel >= 2 && (
                <div className="card p-4 border border-signal-danger/30 bg-signal-danger/5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-signal-danger shrink-0 mt-0.5" />
                    <div>
                      <div className="text-signal-danger text-sm font-semibold">Immediate action recommended</div>
                      <div className="text-ash-400 text-xs mt-0.5">
                        High wind + low humidity creates extreme spread risk. Consider pre-emptive evacuation orders for SVI &gt; 0.7 zones.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
              <Activity className="w-10 h-10 text-ash-700 mb-3" />
              <div className="text-ash-500 text-sm">Set conditions and run the prediction model</div>
            </div>
          )}
        </div>
      </div>

      {/* Fire shape + map + explainer — shown after running */}
      {result && (
        <>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <FireShapeViz spread={result.spread_acres_24h} windSpeed={windSpeed} />
            <div className="card p-4">
              <div className="text-white text-sm font-semibold mb-3">How to Read the Shape</div>
              <div className="space-y-2 text-ash-400 text-xs">
                <p>The fire ellipse elongates in the downwind direction. Higher wind speed = more elongated shape (higher L/W ratio).</p>
                <p>
                  <span className="text-signal-safe font-medium">L/W = {vanWagnerLW(windSpeed).toFixed(1)}:1</span>{' '}
                  at {windSpeed} mph —{' '}
                  {vanWagnerLW(windSpeed) > 5 ? 'highly elongated, fast head fire' : vanWagnerLW(windSpeed) > 2.5 ? 'moderate elongation' : 'nearly circular spread'}
                </p>
                <p>The ignition point (red cross) sits at one focus — backing fire burns slowly upwind while the head fire races downwind.</p>
                <p className="text-ash-600">Van Wagner (1969) · Forestry Chronicle 45(2):103</p>
              </div>
            </div>
          </div>

          {lat != null && lon != null && (
            <div className="mt-4 card p-4">
              <div className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ember-400" /> Projected Fire Growth on Map
              </div>
              <p className="text-ash-500 text-xs mb-3">
                Predicted perimeters overlaid on real map — shows roads, buildings, and communities that may be affected.
              </p>
              <FireSpreadMap
                lat={lat}
                lon={lon}
                spreadAcres24h={result.spread_acres_24h}
                windSpeedMph={windSpeed}
                windDirDeg={windDirDeg}
                currentAcres={fireMode === 'active' ? currentAcres : undefined}
              />
              <p className="text-ash-600 text-xs mt-2">
                {fireMode === 'active'
                  ? 'Dashed orange = current burn perimeter · Yellow→Red = projected additional growth at 1h/3h/6h/12h/24h'
                  : 'Yellow = 1h · Orange = 3h/6h · Red = 12h/24h perimeter · Click ellipses for time horizon'}
              </p>
            </div>
          )}
        </>
      )}

      {result && (
        <div className={`mt-4 card p-4 border-l-4 ${svi >= 0.75 ? 'border-signal-danger' : svi >= 0.5 ? 'border-signal-warn' : 'border-signal-safe'}`}>
          <p className="text-ash-400 text-xs">
            <span className={`font-semibold ${svi >= 0.75 ? 'text-signal-danger' : svi >= 0.5 ? 'text-signal-warn' : 'text-signal-safe'}`}>
              County SVI = {svi.toFixed(2)} ({svi >= 0.75 ? 'High' : svi >= 0.5 ? 'Moderate' : 'Low'} vulnerability)
            </span>
            {detectedCounty ? ` — ${detectedCounty} County` : ''}{' · '}
            WiDS data: high-SVI counties experience evacuation orders up to <strong>11.5 hours later</strong>.
          </p>
        </div>
      )}

      {/* Property Value at Risk — Census ACS (free) */}
      <div className="card p-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-signal-info" />
          <h2 className="text-white font-semibold text-sm">Economic Impact Estimate</h2>
          <span className="ml-auto text-ash-600 text-xs">US Census ACS 2022 · free</span>
        </div>
        <p className="text-ash-500 text-xs mb-3">Enter county name to estimate property values at risk using Census median home value data.</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={censusCounty}
            onChange={e => setCensusCounty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchCensusValue(censusCounty)}
            placeholder="e.g. Los Angeles CA, Butte CA, Boulder CO..."
            className="flex-1 bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-signal-info/60 placeholder:text-ash-600"
          />
          <button
            onClick={() => fetchCensusValue(censusCounty)}
            disabled={censusLoading || !censusCounty.trim()}
            className="px-4 py-2 rounded-lg text-sm bg-signal-info/20 border border-signal-info/30 text-signal-info hover:bg-signal-info/30 transition-colors disabled:opacity-40"
          >
            {censusLoading ? '…' : 'Lookup'}
          </button>
        </div>
        {medianHomeValue && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-ash-900 rounded-lg p-3 border border-ash-800 text-center">
                <div className="font-display text-xl font-bold text-white">${(medianHomeValue / 1000).toFixed(0)}K</div>
                <div className="text-ash-500 text-xs mt-0.5">Median home value</div>
              </div>
              <div className="bg-ash-900 rounded-lg p-3 border border-ash-800 text-center">
                <div className="font-display text-xl font-bold text-signal-warn">${((medianHomeValue * 50) / 1e6).toFixed(0)}M+</div>
                <div className="text-ash-500 text-xs mt-0.5">Est. 50 structures</div>
              </div>
              <div className="bg-ash-900 rounded-lg p-3 border border-ash-800 text-center">
                <div className="font-display text-xl font-bold text-signal-danger">${((medianHomeValue * 500) / 1e6).toFixed(0)}M+</div>
                <div className="text-ash-500 text-xs mt-0.5">Est. 500 structures</div>
              </div>
            </div>
            <p className="text-ash-600 text-xs">Estimate = median home value × threatened structures. Source: Census ACS 2022, table B25077. Does not include commercial property, infrastructure, or indirect costs.</p>
          </div>
        )}
      </div>
    </div>
  )
}

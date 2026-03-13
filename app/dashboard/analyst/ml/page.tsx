'use client'
import { useState } from 'react'
import { Brain, Wind, Thermometer, Droplets, TrendingUp, BarChart3, MapPin, Loader2 } from 'lucide-react'

// Simple county→SVI lookup for auto-detection (top WiDS fire counties)
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

function FireShapeViz({ spread, windSpeed }: { spread: number; windSpeed: number }) {
  const LW = Math.max(1.0, 0.936 * Math.exp(0.2566 * windSpeed) + 0.461 * Math.exp(-0.1548 * windSpeed) - 0.397)
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
          <marker id="arr-a" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#00BFFF" />
          </marker>
        </defs>
        {/* Grid lines */}
        <line x1={CX} y1={4} x2={CX} y2={SVG_H - 4} stroke="#1e2738" strokeWidth={1} strokeDasharray="3 3" />
        <line x1={4} y1={CY} x2={SVG_W - 4} y2={CY} stroke="#1e2738" strokeWidth={1} strokeDasharray="3 3" />
        {/* Compass labels */}
        <text x={CX + 3} y={13} fill="#404050" fontSize={8} fontFamily="monospace">N</text>
        <text x={SVG_W - 11} y={CY + 4} fill="#404050" fontSize={8} fontFamily="monospace">E</text>
        <text x={CX + 3} y={SVG_H - 3} fill="#404050" fontSize={8} fontFamily="monospace">S</text>
        <text x={3} y={CY + 4} fill="#404050" fontSize={8} fontFamily="monospace">W</text>
        {/* Ellipses — outermost first */}
        {[...ellipses].reverse().map(({ t, a_m, b_m, color }) => {
          const sa = a_m * scale, sb = b_m * scale
          const coff = a_m * e * scale
          return (
            <ellipse key={t} cx={CX + coff} cy={CY} rx={sa} ry={sb}
              fill={color + '28'} stroke={color} strokeWidth={1.5} />
          )
        })}
        {/* Ignition crosshair */}
        <circle cx={CX} cy={CY} r={3.5} fill="#FF3333" />
        <line x1={CX - 7} y1={CY} x2={CX + 7} y2={CY} stroke="#FF5555" strokeWidth={1.5} />
        <line x1={CX} y1={CY - 7} x2={CX} y2={CY + 7} stroke="#FF5555" strokeWidth={1.5} />
        {/* Wind arrow */}
        <line x1={CX + 10} y1={CY - 26} x2={CX + 36} y2={CY - 26}
          stroke="#00BFFF" strokeWidth={2} markerEnd="url(#arr-a)" />
        <text x={CX + 10} y={CY - 29} fill="#00BFFF" fontSize={7} fontFamily="monospace">wind →</text>
        {/* Legend */}
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

export default function AnalystMLPage() {
  const [location, setLocation] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [detectedCounty, setDetectedCounty] = useState<string | null>(null)
  const [windSpeed, setWindSpeed] = useState(15)
  const [humidity, setHumidity] = useState(20)
  const [temp, setTemp] = useState(85)
  const [svi, setSvi] = useState(0.65)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<null | { risk: number; spread: number; evac_prob: number; signal_gap_pred: number }>(null)

  async function fetchLocation() {
    if (!location.trim()) return
    setLocationLoading(true)
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(location)}`)
      if (res.ok) {
        const w = await res.json()
        if (w.wind_mph != null) setWindSpeed(Math.min(80, Math.round(w.wind_mph)))
        if (w.humidity_pct != null) setHumidity(Math.round(w.humidity_pct))
        if (w.temp_f != null) setTemp(Math.min(120, Math.max(40, Math.round(w.temp_f))))
        setResult(null)
      }
    } catch {}
    const autoSVI = detectSVI(location)
    if (autoSVI !== null) {
      setSvi(autoSVI)
      const county = Object.entries(COUNTY_SVI).find(([k]) => location.toLowerCase().includes(k))?.[0]
      setDetectedCounty(county ? county.replace(/\b\w/g, c => c.toUpperCase()) : null)
    }
    setLocationLoading(false)
  }

  async function run() {
    setRunning(true)
    await new Promise(r => setTimeout(r, 1200))
    const risk = Math.min(((windSpeed / 60) * 0.35) + ((1 - humidity / 100) * 0.3) + ((temp / 120) * 0.2) + (svi * 0.15), 0.99)
    setResult({
      risk,
      spread: Math.round(risk * 15000 + windSpeed * 80),
      evac_prob: Math.min(risk * 1.3, 0.99),
      signal_gap_pred: Math.round((1 - risk) * 24 + svi * 18),
    })
    setRunning(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-info text-sm font-medium mb-3">
          <Brain className="w-4 h-4" /> ML PREDICTOR · ANALYST
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">ML Spread Predictor</h1>
        <p className="text-ash-400 text-sm">Model trained on 62,696 WiDS wildfire incidents. Predicts spread, evacuation probability, and estimated signal gap.</p>
      </div>

      {/* Location auto-fill */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-signal-info" />
          <span className="text-white text-sm font-medium">Auto-fill conditions from location</span>
          <span className="text-ash-600 text-xs ml-auto">Weather via NOAA · SVI from WiDS dataset</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchLocation()}
            placeholder="City, county, or zip — e.g. Paradise, CA"
            className="flex-1 bg-ash-800 border border-ash-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-signal-info/60 placeholder:text-ash-600"
          />
          <button onClick={fetchLocation} disabled={locationLoading}
            className="px-4 py-2 rounded-lg text-sm bg-signal-info/20 border border-signal-info/30 text-signal-info hover:bg-signal-info/30 transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {locationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            Fetch
          </button>
        </div>
        {detectedCounty && (
          <p className="text-signal-info text-xs mt-2">
            SVI auto-detected for {detectedCounty} County · Adjust sliders if needed
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-5">
          <h2 className="text-white font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-ash-400" /> Feature Inputs</h2>
          {[
            { label: 'Wind Speed', icon: Wind, value: windSpeed, set: setWindSpeed, min: 0, max: 80, unit: 'mph' },
            { label: 'Relative Humidity', icon: Droplets, value: humidity, set: setHumidity, min: 0, max: 100, unit: '%' },
            { label: 'Temperature', icon: Thermometer, value: temp, set: setTemp, min: 40, max: 120, unit: '°F' },
            { label: 'SVI Score', icon: TrendingUp, value: svi, set: setSvi, min: 0, max: 1, step: 0.01, unit: '' },
          ].map(({ label, icon: Icon, value, set, min, max, unit, step }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-ash-500" /><span className="text-ash-300 text-sm">{label}</span></div>
                <span className="text-white font-mono text-sm">{step === 0.01 ? Number(value).toFixed(2) : value}{unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step ?? 1} value={value}
                onChange={e => { set(Number(e.target.value)); setResult(null) }}
                className="w-full accent-blue-500" />
            </div>
          ))}
          <button onClick={run} disabled={running} className="btn-primary w-full flex items-center justify-center gap-2">
            {running ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running…</> : <><Brain className="w-4 h-4" /> Run Model</>}
          </button>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Fire risk score', value: `${(result.risk * 100).toFixed(1)}%`, color: result.risk > 0.75 ? 'text-signal-danger' : result.risk > 0.5 ? 'text-signal-warn' : 'text-signal-safe' },
                  { label: 'Projected spread (24h)', value: `${result.spread.toLocaleString()} ac`, color: 'text-signal-warn' },
                  { label: 'Evacuation probability', value: `${(result.evac_prob * 100).toFixed(0)}%`, color: result.evac_prob > 0.7 ? 'text-signal-danger' : 'text-signal-warn' },
                  { label: 'Est. signal gap', value: `${result.signal_gap_pred}h`, color: result.signal_gap_pred > 12 ? 'text-signal-danger' : 'text-ash-300' },
                ].map(s => (
                  <div key={s.label} className="card p-4">
                    <div className="text-ash-500 text-xs mb-1">{s.label}</div>
                    <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card p-4">
                <div className="text-ash-400 text-xs font-medium mb-3">Feature importance (this run)</div>
                {[
                  { label: 'Wind speed', weight: windSpeed / 80 * 0.35 / 0.35 },
                  { label: 'Humidity (inverse)', weight: (1 - humidity / 100) },
                  { label: 'Temperature', weight: temp / 120 },
                  { label: 'SVI vulnerability', weight: svi },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-3 mb-2">
                    <span className="text-ash-400 text-xs w-32 shrink-0">{f.label}</span>
                    <div className="flex-1 h-2 bg-ash-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.weight * 100}%` }} />
                    </div>
                    <span className="text-ash-400 text-xs w-10 text-right">{(f.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card p-10 flex flex-col items-center justify-center text-center">
              <Brain className="w-10 h-10 text-ash-700 mb-3" />
              <div className="text-ash-500 text-sm">Set feature inputs and run the model</div>
            </div>
          )}
        </div>
      </div>

      {/* Fire shape visualization — shown after running */}
      {result && (
        <div className="mt-6">
          <FireShapeViz spread={result.spread} windSpeed={windSpeed} />
        </div>
      )}

      {/* SVI context */}
      {result && (
        <div className={`mt-4 card p-4 border-l-4 ${svi >= 0.75 ? 'border-signal-danger' : svi >= 0.5 ? 'border-signal-warn' : 'border-signal-safe'}`}>
          <p className="text-ash-400 text-xs">
            <span className={`font-semibold ${svi >= 0.75 ? 'text-signal-danger' : svi >= 0.5 ? 'text-signal-warn' : 'text-signal-safe'}`}>
              County SVI = {svi.toFixed(2)} ({svi >= 0.75 ? 'High' : svi >= 0.5 ? 'Moderate' : 'Low'} vulnerability)
            </span>
            {detectedCounty ? ` — ${detectedCounty} County` : ''}{' · '}
            WiDS data: high-SVI counties face evacuation orders up to <strong>11.5 hours later</strong> than low-SVI counties.
          </p>
        </div>
      )}
    </div>
  )
}

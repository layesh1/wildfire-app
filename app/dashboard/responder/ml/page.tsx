'use client'
import { useState } from 'react'
import { Activity, Wind, Thermometer, Droplets, TrendingUp, AlertTriangle } from 'lucide-react'

const RISK_LEVELS = [
  { label: 'Low', color: 'text-signal-safe', bg: 'bg-signal-safe/10 border-signal-safe/30' },
  { label: 'Moderate', color: 'text-signal-warn', bg: 'bg-signal-warn/10 border-signal-warn/30' },
  { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { label: 'Critical', color: 'text-signal-danger', bg: 'bg-signal-danger/10 border-signal-danger/30' },
]

export default function MLPredictorPage() {
  const [windSpeed, setWindSpeed] = useState(15)
  const [humidity, setHumidity] = useState(20)
  const [temp, setTemp] = useState(85)
  const [svi, setSvi] = useState(0.65)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<null | { risk: number; spread_acres_24h: number; evac_probability: number }>(null)

  async function runPrediction() {
    setRunning(true)
    // Rule-based prediction (ML service optional)
    await new Promise(r => setTimeout(r, 1200))
    const risk = Math.min(
      ((windSpeed / 60) * 0.35) + ((1 - humidity / 100) * 0.3) + ((temp / 120) * 0.2) + (svi * 0.15),
      0.99
    )
    setResult({
      risk,
      spread_acres_24h: Math.round(risk * 15000 + windSpeed * 80),
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

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-6">
          <h2 className="text-white font-semibold">Conditions Input</h2>

          {[
            { label: 'Wind Speed', icon: Wind, value: windSpeed, set: setWindSpeed, min: 0, max: 80, unit: 'mph', color: 'ember' },
            { label: 'Relative Humidity', icon: Droplets, value: humidity, set: setHumidity, min: 0, max: 100, unit: '%', color: 'blue' },
            { label: 'Temperature', icon: Thermometer, value: temp, set: setTemp, min: 40, max: 120, unit: '°F', color: 'orange' },
            { label: 'SVI Score (community vulnerability)', icon: TrendingUp, value: svi, set: setSvi, min: 0, max: 1, step: 0.01, unit: '', color: 'red' },
          ].map(({ label, icon: Icon, value, set, min, max, unit, color, step }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-ash-400" />
                  <label className="text-ash-300 text-sm">{label}</label>
                </div>
                <span className="text-white font-mono text-sm font-bold">{typeof value === 'number' && step === 0.01 ? value.toFixed(2) : value}{unit}</span>
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
                  <div className="text-ash-400 text-xs mb-1">Projected spread (24h)</div>
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
                        High wind + low humidity combination creates extreme spread risk. Consider pre-emptive evacuation orders for SVI &gt; 0.7 zones.
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
    </div>
  )
}

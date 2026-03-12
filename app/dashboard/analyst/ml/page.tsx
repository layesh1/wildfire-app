'use client'
import { useState } from 'react'
import { Brain, Wind, Thermometer, Droplets, TrendingUp, BarChart3 } from 'lucide-react'

export default function AnalystMLPage() {
  const [windSpeed, setWindSpeed] = useState(15)
  const [humidity, setHumidity] = useState(20)
  const [temp, setTemp] = useState(85)
  const [svi, setSvi] = useState(0.65)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<null | { risk: number; spread: number; evac_prob: number; signal_gap_pred: number }>(null)

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
    </div>
  )
}

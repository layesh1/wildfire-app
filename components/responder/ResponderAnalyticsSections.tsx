'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Brain, ShieldAlert } from 'lucide-react'
import type { PredictionFire } from '@/app/dashboard/responder/PredictionMap'

const PredictionMap = dynamic(() => import('@/app/dashboard/responder/PredictionMap'), { ssr: false })
const AnimatedFireSpread = dynamic(() => import('@/components/AnimatedFireSpread'), { ssr: false })

export const PREDICTION_FIRES: PredictionFire[] = [
  { id: 'd1', fire_name: 'Dixie Fire', latitude: 40.0, longitude: -121.1, acres: 963309, containment: null, svi_score: 0.69, signal_gap_hours: 3.5 },
  { id: 'd2', fire_name: 'Bootleg Fire', latitude: 42.4, longitude: -121.0, acres: 401279, containment: null, svi_score: 0.58, signal_gap_hours: 2.1 },
  { id: 'd3', fire_name: 'Wallow Fire', latitude: 33.8, longitude: -109.2, acres: 538049, containment: null, svi_score: 0.74, signal_gap_hours: 18.4 },
  { id: 'd4', fire_name: 'Creek Fire', latitude: 37.2, longitude: -119.3, acres: 379895, containment: null, svi_score: 0.72, signal_gap_hours: 4.2 },
  { id: 'd5', fire_name: 'Caldor Fire', latitude: 38.6, longitude: -120.1, acres: 221774, containment: null, svi_score: 0.61, signal_gap_hours: 6.8 },
  { id: 'd6', fire_name: 'Monument Fire', latitude: 40.7, longitude: -123.0, acres: 223124, containment: null, svi_score: 0.63, signal_gap_hours: null },
  { id: 'd7', fire_name: 'Snake River Complex', latitude: 42.5, longitude: -116.8, acres: 481838, containment: null, svi_score: 0.71, signal_gap_hours: null },
  { id: 'd8', fire_name: 'Whitewater-Baldy', latitude: 33.4, longitude: -108.3, acres: 297845, containment: null, svi_score: 0.78, signal_gap_hours: null },
]

export function PredictionMapSection({ center }: { center: [number, number] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-ember-400" />
        <h2 className="text-white font-semibold text-sm">Fire Prediction Map — ML Risk Zones</h2>
        <span className="ml-auto text-ash-600 text-xs">Centered on station · WiDS historical incidents</span>
      </div>
      <div className="card overflow-hidden" style={{ height: 500 }}>
        <PredictionMap fires={PREDICTION_FIRES} center={center} />
      </div>
      <p className="text-ash-600 text-xs mt-2">
        Risk zones show estimated at-risk housing radius. Popup shows ML-derived evacuation estimates. Dot size = fire acreage. Color = containment level.
      </p>
    </div>
  )
}

export const SCENARIOS = [
  { label: 'Calm', windMps: 8, slopeDeg: 0 },
  { label: 'Moderate', windMps: 14, slopeDeg: 15 },
  { label: 'Extreme', windMps: 20, slopeDeg: 30 },
] as const

export function FireBehaviorSection() {
  const [scenario, setScenario] = useState(1)
  const s = SCENARIOS[scenario]
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-ember-400" />
        <h2 className="text-white font-semibold text-sm">Fire Behavior Simulator</h2>
        <span className="ml-auto text-ash-600 text-xs">FireBench-calibrated · Google Research physics model</span>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {SCENARIOS.map((sc, i) => (
          <button key={sc.label} type="button" onClick={() => setScenario(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${scenario === i ? 'bg-ember-500 text-white' : 'bg-ash-800 text-ash-400 hover:text-white'}`}>
            {sc.label} ({sc.windMps}m/s / {sc.slopeDeg}°)
          </button>
        ))}
      </div>
      <AnimatedFireSpread windMps={s.windMps} slopeDeg={s.slopeDeg} currentAcres={500} title="Fire Spread — Tactical Simulation" />
    </div>
  )
}

export function WiDSIntelligencePanel({ activeFires, loading }: { activeFires: any[]; loading: boolean }) {
  const withGap = activeFires.filter(f => f.signal_gap_hours != null)
  const avgGap = withGap.length > 0
    ? (withGap.reduce((s, f) => s + f.signal_gap_hours, 0) / withGap.length).toFixed(1)
    : null
  const highSvi = activeFires.filter(f => f.svi_score != null && f.svi_score > 0.7).length
  const longGap = activeFires.filter(f => f.signal_gap_hours != null && f.signal_gap_hours > 12).length

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-signal-warn" />
        <h2 className="text-white font-semibold text-sm">WiDS Signal Gap Intelligence</h2>
        <span className="ml-auto text-ash-600 text-xs">WiDS 2021–2025 dataset · 62,696 incidents</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Avg Alert Delay', value: loading ? '…' : avgGap ? `${avgGap}h` : '—', color: 'text-signal-warn', sub: 'hours before formal order' },
          { label: 'High Vulnerability', value: loading ? '…' : `${highSvi}`, color: 'text-signal-danger', sub: 'fires in SVI > 0.7 zones' },
          { label: 'Critical Gap (>12h)', value: loading ? '…' : `${longGap}`, color: 'text-signal-danger', sub: 'fires with 12h+ delay' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-white text-xs font-medium mt-1">{s.label}</div>
            <div className="text-ash-500 text-xs mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="card p-4 bg-signal-warn/5 border-signal-warn/20">
        <p className="text-ash-400 text-xs leading-relaxed">
          <span className="text-signal-warn font-semibold">Research finding: </span>
          99.74% of wildfire incidents in the WiDS dataset had no formal evacuation order — only an informal signal gap.
          The median delay between fire detection and formal order is <span className="text-white font-semibold">11.5 hours</span>.
          Use ML prediction to identify high-risk zones before the gap becomes critical.
        </p>
      </div>
    </div>
  )
}

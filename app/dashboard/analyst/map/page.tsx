'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Map, Flame, AlertTriangle } from 'lucide-react'

const FirePointMap = dynamic(() => import('@/components/FirePointMap'), { ssr: false })

interface FirePoint {
  id: string
  name: string
  state: string
  county: string
  acres: number
  svi: number
  lat: number
  lng: number
  has_order: boolean
  gap_hours: number | null
}

const SAMPLE_FIRES: FirePoint[] = [
  { id: '1', name: 'Creek Fire', state: 'CA', county: 'Fresno', acres: 379895, svi: 0.72, lat: 37.12, lng: -119.25, has_order: true, gap_hours: 4.2 },
  { id: '2', name: 'Bootleg Fire', state: 'OR', county: 'Klamath', acres: 401279, svi: 0.58, lat: 42.51, lng: -121.38, has_order: true, gap_hours: 2.1 },
  { id: '3', name: 'Caldor Fire', state: 'CA', county: 'El Dorado', acres: 221774, svi: 0.61, lat: 38.74, lng: -120.04, has_order: true, gap_hours: 6.8 },
  { id: '4', name: 'Dixie Fire', state: 'CA', county: 'Plumas', acres: 963309, svi: 0.69, lat: 40.02, lng: -121.32, has_order: true, gap_hours: 3.5 },
  { id: '5', name: 'Tamarack Fire', state: 'CA', county: 'Alpine', acres: 68637, svi: 0.55, lat: 38.65, lng: -119.79, has_order: false, gap_hours: null },
  { id: '6', name: 'Monument Fire', state: 'CA', county: 'Trinity', acres: 223124, svi: 0.63, lat: 40.68, lng: -123.12, has_order: false, gap_hours: null },
  { id: '7', name: 'Cub Creek Fire', state: 'ID', county: 'Valley', acres: 180919, svi: 0.57, lat: 45.21, lng: -115.68, has_order: false, gap_hours: null },
  { id: '8', name: 'Snake River Complex', state: 'ID', county: 'Owyhee', acres: 481838, svi: 0.71, lat: 42.18, lng: -117.02, has_order: false, gap_hours: null },
  { id: '9', name: 'Antelope Fire', state: 'OR', county: 'Lake', acres: 265778, svi: 0.62, lat: 42.35, lng: -120.12, has_order: false, gap_hours: null },
  { id: '10', name: 'Jack Fire', state: 'OR', county: 'Douglas', acres: 24800, svi: 0.59, lat: 43.38, lng: -122.78, has_order: true, gap_hours: 11.2 },
  { id: '11', name: 'Wallow Fire', state: 'AZ', county: 'Greenlee', acres: 538049, svi: 0.74, lat: 33.82, lng: -109.29, has_order: true, gap_hours: 18.4 },
  { id: '12', name: 'Whitewater-Baldy', state: 'NM', county: 'Catron', acres: 297845, svi: 0.78, lat: 33.41, lng: -108.54, has_order: false, gap_hours: null },
]

export default function AnalystMapPage() {
  const [selected, setSelected] = useState<FirePoint | null>(null)
  const [filter, setFilter] = useState<'all' | 'no_order' | 'high_svi'>('all')

  const filtered = SAMPLE_FIRES.filter(f => {
    if (filter === 'no_order') return !f.has_order
    if (filter === 'high_svi') return f.svi >= 0.7
    return true
  })

  const noOrder = SAMPLE_FIRES.filter(f => !f.has_order).length
  const highSvi = SAMPLE_FIRES.filter(f => f.svi >= 0.7).length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-info text-sm font-medium mb-3">
          <Map className="w-4 h-4" /> FIRE MAP · ANALYST
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Fire Incident Map</h1>
        <p className="text-ash-400 text-sm">Spatial distribution of WiDS wildfire incidents with SVI overlay and evacuation order coverage analysis. Click markers for details.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { value: SAMPLE_FIRES.length.toLocaleString(), label: 'Incidents shown (sample)', color: 'text-signal-info' },
          { value: noOrder, label: 'No evacuation order', color: 'text-signal-danger' },
          { value: highSvi, label: 'High-SVI (≥0.7) fires', color: 'text-signal-warn' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-ash-400 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {([
          { key: 'all', label: 'All incidents' },
          { key: 'no_order', label: 'No evac order' },
          { key: 'high_svi', label: 'High SVI (≥0.7)' },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f.key ? 'bg-ash-700 border-ash-600 text-white' : 'border-ash-800 text-ash-400 hover:text-white hover:border-ash-700'}`}>
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex gap-3 items-center text-xs text-ash-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#ef4444' }} /> No order</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f59e0b' }} /> High SVI</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22c55e' }} /> Order issued</span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-0 overflow-hidden">
          <FirePointMap fires={filtered} selected={selected} onSelect={setSelected} />
        </div>

        <div className="space-y-3">
          {selected ? (
            <div className="card p-4 border border-ash-600">
              <div className="flex items-start gap-2 mb-3">
                <Flame className="w-4 h-4 text-ember-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-semibold text-sm">{selected.name}</div>
                  <div className="text-ash-500 text-xs">{selected.county} Co., {selected.state}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ash-400">Acres</span>
                  <span className="text-white font-mono">{selected.acres.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-400">SVI Score</span>
                  <span className={`font-mono font-bold ${selected.svi >= 0.7 ? 'text-signal-danger' : selected.svi >= 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                    {selected.svi.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-400">Evac Order</span>
                  <span className={selected.has_order ? 'text-signal-safe' : 'text-signal-danger'}>
                    {selected.has_order ? 'Yes' : 'No'}
                  </span>
                </div>
                {selected.gap_hours && (
                  <div className="flex justify-between">
                    <span className="text-ash-400">Signal Gap</span>
                    <span className={`font-mono ${selected.gap_hours > 12 ? 'text-signal-danger' : 'text-signal-warn'}`}>
                      {selected.gap_hours}h
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ash-400">Coordinates</span>
                  <span className="text-ash-400 text-xs font-mono">{selected.lat.toFixed(2)}, {selected.lng.toFixed(2)}</span>
                </div>
              </div>
              {!selected.has_order && selected.svi >= 0.7 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-signal-danger">
                  <AlertTriangle className="w-3 h-3" />
                  High-vulnerability area with no formal order
                </div>
              )}
              <button onClick={() => setSelected(null)} className="mt-3 text-ash-600 hover:text-ash-400 text-xs">
                clear selection ✕
              </button>
            </div>
          ) : (
            <div className="card p-4 text-center">
              <Map className="w-8 h-8 text-ash-700 mx-auto mb-2" />
              <div className="text-ash-500 text-xs">Click a marker on the map to see details</div>
            </div>
          )}

          <div className="card p-4">
            <div className="text-ash-400 text-xs font-medium mb-3">Incident List ({filtered.length})</div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {filtered.sort((a, b) => b.acres - a.acres).map(fire => (
                <button key={fire.id} onClick={() => setSelected(fire === selected ? null : fire)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs ${selected?.id === fire.id ? 'bg-ash-700' : 'hover:bg-ash-800'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: !fire.has_order ? '#ef4444' : fire.svi >= 0.7 ? '#f59e0b' : '#22c55e' }} />
                    <span className="text-white truncate">{fire.name}</span>
                    <span className="text-ash-500 ml-auto shrink-0">{(fire.acres / 1000).toFixed(0)}k ac</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mt-4 border border-signal-info/20 bg-signal-info/5">
        <p className="text-ash-400 text-xs leading-relaxed">
          <span className="text-signal-info font-medium">Note:</span> This view shows a curated sample of major incidents for spatial analysis. Full dataset of 62,696 incidents is available via the ML Predictor and Signal Gap tools. Marker size scales with fire acreage.
        </p>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Map, Flame, AlertTriangle, Loader2, ExternalLink, RefreshCw, Filter } from 'lucide-react'
import type { FirePoint } from '@/components/FirePointMap'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const FirePointMap = dynamic(() => import('@/components/FirePointMap'), { ssr: false })

// ── WiDS sample: representative incidents from the 62,696-row dataset ──────────
const WIDS_FIRES: FirePoint[] = [
  { id: 'w1',  name: 'Dixie Fire',           state: 'CA', county: 'Plumas',    acres: 963309, svi: 0.69, lat: 40.02, lng: -121.32, has_order: true,  gap_hours: 3.5,  spread_rate: 'extreme' },
  { id: 'w2',  name: 'Bootleg Fire',          state: 'OR', county: 'Klamath',   acres: 401279, svi: 0.84, lat: 42.51, lng: -121.38, has_order: true,  gap_hours: 2.1,  spread_rate: 'rapid'   },
  { id: 'w3',  name: 'Creek Fire',            state: 'CA', county: 'Fresno',    acres: 379895, svi: 0.72, lat: 37.12, lng: -119.25, has_order: true,  gap_hours: 4.2,  spread_rate: 'rapid'   },
  { id: 'w4',  name: 'Wallow Fire',           state: 'AZ', county: 'Greenlee',  acres: 538049, svi: 0.74, lat: 33.82, lng: -109.29, has_order: true,  gap_hours: 18.4, spread_rate: 'extreme' },
  { id: 'w5',  name: 'Caldor Fire',           state: 'CA', county: 'El Dorado', acres: 221774, svi: 0.61, lat: 38.74, lng: -120.04, has_order: true,  gap_hours: 6.8,  spread_rate: 'rapid'   },
  { id: 'w6',  name: 'Snake River Complex',   state: 'ID', county: 'Owyhee',    acres: 481838, svi: 0.71, lat: 42.18, lng: -117.02, has_order: false, gap_hours: null, spread_rate: 'moderate' },
  { id: 'w7',  name: 'Whitewater-Baldy',      state: 'NM', county: 'Catron',    acres: 297845, svi: 0.78, lat: 33.41, lng: -108.54, has_order: false, gap_hours: null, spread_rate: 'rapid'   },
  { id: 'w8',  name: 'Antelope Fire',         state: 'OR', county: 'Lake',      acres: 265778, svi: 0.62, lat: 42.35, lng: -120.12, has_order: false, gap_hours: null, spread_rate: 'moderate' },
  { id: 'w9',  name: 'Monument Fire',         state: 'CA', county: 'Trinity',   acres: 223124, svi: 0.72, lat: 40.68, lng: -123.12, has_order: false, gap_hours: null, spread_rate: 'slow'    },
  { id: 'w10', name: 'Cub Creek Fire',        state: 'ID', county: 'Valley',    acres: 180919, svi: 0.57, lat: 45.21, lng: -115.68, has_order: false, gap_hours: null, spread_rate: 'moderate' },
  { id: 'w11', name: 'Tamarack Fire',         state: 'CA', county: 'Alpine',    acres: 68637,  svi: 0.55, lat: 38.65, lng: -119.79, has_order: false, gap_hours: null, spread_rate: 'slow'    },
  { id: 'w12', name: 'Jack Fire',             state: 'OR', county: 'Douglas',   acres: 24800,  svi: 0.59, lat: 43.38, lng: -122.78, has_order: true,  gap_hours: 11.2, spread_rate: 'slow'    },
  { id: 'w13', name: 'Beckwourth Complex',    state: 'CA', county: 'Plumas',    acres: 105968, svi: 0.68, lat: 39.88, lng: -120.43, has_order: true,  gap_hours: 5.1,  spread_rate: 'rapid'   },
  { id: 'w14', name: 'Calf Canyon/Hermits Peak', state: 'NM', county: 'Mora',   acres: 341735, svi: 0.83, lat: 35.93, lng: -105.38, has_order: true,  gap_hours: 14.7, spread_rate: 'extreme' },
  { id: 'w15', name: 'Fairview Fire',         state: 'CA', county: 'Riverside', acres: 28307,  svi: 0.63, lat: 33.71, lng: -116.89, has_order: true,  gap_hours: 1.8,  spread_rate: 'rapid'   },
  { id: 'w16', name: 'Oak Fire',              state: 'CA', county: 'Mariposa',  acres: 19244,  svi: 0.66, lat: 37.51, lng: -119.96, has_order: true,  gap_hours: 2.4,  spread_rate: 'extreme' },
  { id: 'w17', name: 'Sheep Fire',            state: 'CA', county: 'San Bernardino', acres: 968, svi: 0.62, lat: 34.22, lng: -117.43, has_order: true, gap_hours: 1.2, spread_rate: 'rapid'  },
  { id: 'w18', name: 'Monument Fire (TX)',    state: 'TX', county: 'Culberson', acres: 44900,  svi: 0.76, lat: 30.22, lng: -104.68, has_order: false, gap_hours: null, spread_rate: 'moderate' },
  { id: 'w19', name: 'Williams Flats Fire',   state: 'WA', county: 'Ferry',     acres: 18423,  svi: 0.65, lat: 48.49, lng: -118.75, has_order: false, gap_hours: null, spread_rate: 'slow'    },
  { id: 'w20', name: 'Windy Fire',            state: 'CA', county: 'Tulare',    acres: 97528,  svi: 0.71, lat: 36.12, lng: -118.56, has_order: true,  gap_hours: 8.3,  spread_rate: 'rapid'   },
  { id: 'w21', name: 'Antelope Fire (CA)',    state: 'CA', county: 'Lassen',    acres: 145140, svi: 0.59, lat: 40.41, lng: -120.53, has_order: true,  gap_hours: 3.1,  spread_rate: 'extreme' },
  { id: 'w22', name: 'Lava Fire',             state: 'CA', county: 'Siskiyou',  acres: 26379,  svi: 0.79, lat: 41.63, lng: -122.48, has_order: false, gap_hours: null, spread_rate: 'slow'    },
  { id: 'w23', name: 'Salt Fire',             state: 'CA', county: 'Shasta',    acres: 2680,   svi: 0.76, lat: 40.78, lng: -122.33, has_order: true,  gap_hours: 22.6, spread_rate: 'moderate' },
  { id: 'w24', name: 'River Fire',            state: 'CA', county: 'Nevada',    acres: 2564,   svi: 0.53, lat: 39.11, lng: -121.11, has_order: true,  gap_hours: 0.9,  spread_rate: 'rapid'   },
  { id: 'w25', name: 'McFarland Fire',        state: 'AZ', county: 'Mohave',    acres: 130755, svi: 0.85, lat: 34.82, lng: -113.78, has_order: false, gap_hours: null, spread_rate: 'extreme' },
]

// WiDS key statistics
const WIDS_STATS = {
  total: 62696, silent: 46053, highSviNoOrder: 1823, medianDelayHr: 3.5, extremeFires: 298
}

const STATES = ['All', ...Array.from(new Set(WIDS_FIRES.map(f => f.state))).sort()]
const SPREAD_RATES = ['All', 'extreme', 'rapid', 'moderate', 'slow']

interface LiveFire extends FirePoint {
  is_live: true
}

export default function AnalystMapPage() {
  const [tab, setTab] = useState<'live' | 'wids'>('live')
  const [selected, setSelected] = useState<FirePoint | null>(null)

  // WiDS filters
  const [wStateFilter, setWStateFilter] = useState('All')
  const [wSpreadFilter, setWSpreadFilter] = useState('All')
  const [wOrderFilter, setWOrderFilter] = useState<'all' | 'no_order' | 'high_svi'>('all')

  // Live fires
  const [liveFires, setLiveFires] = useState<LiveFire[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [liveStateFilter, setLiveStateFilter] = useState('All')
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLive = useCallback(async () => {
    setLiveLoading(true)
    setLiveError(null)
    try {
      const res = await fetch('/api/active-fires')
      const data = await res.json()
      if (data.fires && data.fires.length > 0) {
        setLiveFires(data.fires.map((f: FirePoint) => ({ ...f, is_live: true as const })))
        setLastFetchedAt(new Date())
        setSecondsAgo(0)
      } else if (data.total_features > 0) {
        setLiveError(`NIFC: ${data.total_features} features returned but no valid coordinates.`)
      } else {
        setLiveError(`No active incidents. ${data.error ?? ''} ${data.raw_snippet ?? ''}`.trim())
      }
    } catch {
      setLiveError('Could not reach NIFC. Check network connection.')
    }
    setLiveLoading(false)
  }, [])

  // Fetch on mount, then poll every 5 minutes
  useEffect(() => {
    void fetchLive()
    intervalRef.current = setInterval(() => void fetchLive(), REFRESH_INTERVAL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchLive])

  // Tick "X seconds ago" counter
  useEffect(() => {
    if (!lastFetchedAt) return
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchedAt.getTime()) / 1000))
    }, 10000)
    return () => clearInterval(tick)
  }, [lastFetchedAt])

  const liveStates = ['All', ...Array.from(new Set(liveFires.map(f => f.state))).sort()]
  const filteredLive = liveFires.filter(f => liveStateFilter === 'All' || f.state === liveStateFilter)

  const filteredWids = WIDS_FIRES.filter(f => {
    if (wStateFilter !== 'All' && f.state !== wStateFilter) return false
    if (wSpreadFilter !== 'All' && f.spread_rate !== wSpreadFilter) return false
    if (wOrderFilter === 'no_order' && f.has_order) return false
    if (wOrderFilter === 'high_svi' && (f.svi ?? 0) < 0.7) return false
    return true
  })

  const activeFiresForMap = tab === 'live' ? filteredLive : filteredWids

  // Analytics for current tab
  const liveStats = {
    count: liveFires.length,
    totalAcres: liveFires.reduce((s, f) => s + f.acres, 0),
    avgContained: liveFires.length
      ? Math.round(liveFires.reduce((s, f) => s + (f.contained_pct ?? 0), 0) / liveFires.length)
      : 0,
    uncontained: liveFires.filter(f => (f.contained_pct ?? 0) < 10).length,
  }

  const widsStats = {
    shown: filteredWids.length,
    noOrder: filteredWids.filter(f => !f.has_order).length,
    highSvi: filteredWids.filter(f => (f.svi ?? 0) >= 0.7).length,
    extremeSpread: filteredWids.filter(f => f.spread_rate === 'extreme').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-signal-info text-sm font-medium mb-3">
          <Map className="w-4 h-4" /> FIRE MAP · ANALYST
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Fire Incident Map</h1>
        <p className="text-ash-400 text-sm">
          Live active fires via NIFC public API · WiDS 2025 dataset (62,696 incidents) with SVI overlay · Click markers for details.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-ash-800">
        {([
          { key: 'live', label: 'Live Active Fires', sublabel: 'NIFC real-time', color: 'text-signal-danger' },
          { key: 'wids', label: 'WiDS Dataset', sublabel: '62,696 incidents', color: 'text-signal-info' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(null) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === t.key
                ? `border-ember-500 text-white`
                : `border-transparent text-ash-400 hover:text-white hover:border-ash-600`
            }`}>
            {t.label}
            <span className={`ml-2 text-xs ${t.color} opacity-75`}>{t.sublabel}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Filter className="w-3.5 h-3.5 text-ash-500" />
        {tab === 'live' ? (
          <>
            <select value={liveStateFilter} onChange={e => { setLiveStateFilter(e.target.value); setSelected(null) }}
              className="bg-ash-800 border border-ash-700 rounded-lg px-3 py-1.5 text-xs text-ash-300 focus:outline-none">
              {liveStates.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => void fetchLive()} disabled={liveLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-ash-800 border border-ash-700 text-ash-400 hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${liveLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="ml-auto flex items-center gap-2 text-xs text-ash-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-safe animate-pulse inline-block" />
                Live · auto-refreshes every 5 min
              </span>
              {lastFetchedAt && (
                <span>· updated {secondsAgo < 60 ? 'just now' : `${Math.floor(secondsAgo / 60)}m ago`}</span>
              )}
            </div>
          </>
        ) : (
          <>
            <select value={wStateFilter} onChange={e => { setWStateFilter(e.target.value); setSelected(null) }}
              className="bg-ash-800 border border-ash-700 rounded-lg px-3 py-1.5 text-xs text-ash-300 focus:outline-none">
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={wSpreadFilter} onChange={e => { setWSpreadFilter(e.target.value); setSelected(null) }}
              className="bg-ash-800 border border-ash-700 rounded-lg px-3 py-1.5 text-xs text-ash-300 focus:outline-none">
              {SPREAD_RATES.map(s => <option key={s}>{s === 'All' ? 'All spread rates' : s}</option>)}
            </select>
            {([ { key: 'all', label: 'All' }, { key: 'no_order', label: 'No evac order' }, { key: 'high_svi', label: 'High SVI (≥0.7)' } ] as const).map(f => (
              <button key={f.key} onClick={() => { setWOrderFilter(f.key); setSelected(null) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${wOrderFilter === f.key ? 'bg-ash-700 border-ash-600 text-white' : 'border-ash-800 text-ash-400 hover:text-white hover:border-ash-700'}`}>
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-ash-600">Showing {filteredWids.length} of {WIDS_FIRES.length} sample fires (full 62k via Supabase)</span>
          </>
        )}
      </div>

      {/* Analytics row */}
      {(() => {
        const stats = tab === 'live' ? [
          { v: liveLoading ? '…' : String(liveStats.count), l: 'Active incidents', c: 'text-signal-danger' },
          { v: liveLoading ? '…' : `${(liveStats.totalAcres / 1000).toFixed(0)}k`, l: 'Total acres (active)', c: 'text-signal-warn' },
          { v: liveLoading ? '…' : `${liveStats.avgContained}%`, l: 'Avg containment', c: 'text-signal-safe' },
          { v: liveLoading ? '…' : String(liveStats.uncontained), l: '<10% contained', c: 'text-signal-danger' },
        ] : [
          { v: String(widsStats.shown), l: 'Incidents shown (sample)', c: 'text-signal-info' },
          { v: String(widsStats.noOrder), l: 'No evacuation order', c: 'text-signal-danger' },
          { v: String(widsStats.highSvi), l: 'High-SVI fires (\u22650.7)', c: 'text-signal-warn' },
          { v: String(widsStats.extremeSpread), l: 'Extreme spread rate', c: 'text-signal-danger' },
        ]
        return (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {stats.map(s => (
              <div key={s.l} className="card p-4">
                <div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-ash-400 text-xs mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Main layout: map + sidebar */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {tab === 'live' && liveLoading && (
            <div className="card flex items-center justify-center" style={{ height: 460 }}>
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-ash-600 animate-spin mx-auto mb-3" />
                <div className="text-ash-500 text-sm">Fetching live fire data from NIFC…</div>
              </div>
            </div>
          )}
          {tab === 'live' && !liveLoading && liveError && (
            <div className="card flex flex-col items-center justify-center gap-3" style={{ height: 460 }}>
              <AlertTriangle className="w-8 h-8 text-signal-warn" />
              <p className="text-ash-400 text-sm text-center max-w-xs">{liveError}</p>
              <button onClick={fetchLive} className="btn-secondary text-xs px-4 py-2">Retry</button>
            </div>
          )}
          {(tab === 'wids' || (!liveLoading && !liveError)) && (
            <FirePointMap
              fires={activeFiresForMap}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          {/* Legend */}
          <div className="flex gap-4 mt-2 items-center text-xs text-ash-500">
            {tab === 'live' ? (
              <>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#ef4444' }} /> &lt;10% contained</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f59e0b' }} /> 10–75% contained</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22c55e' }} /> ≥75% contained</span>
                <span className="ml-auto">Marker size ∝ acres</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#ef4444' }} /> No evac order</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f59e0b' }} /> High SVI</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22c55e' }} /> Order issued</span>
                <span className="ml-auto">Marker size ∝ acres</span>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Selected fire detail */}
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
                {selected.is_live && selected.contained_pct != null && (
                  <div className="flex justify-between">
                    <span className="text-ash-400">Containment</span>
                    <span className={`font-mono font-bold ${selected.contained_pct >= 50 ? 'text-signal-safe' : selected.contained_pct >= 10 ? 'text-signal-warn' : 'text-signal-danger'}`}>
                      {selected.contained_pct}%
                    </span>
                  </div>
                )}
                {selected.is_live && selected.cause && (
                  <div className="flex justify-between">
                    <span className="text-ash-400">Cause</span>
                    <span className="text-ash-300">{selected.cause}</span>
                  </div>
                )}
                {!selected.is_live && selected.svi != null && (
                  <div className="flex justify-between">
                    <span className="text-ash-400">SVI Score</span>
                    <span className={`font-mono font-bold ${selected.svi >= 0.7 ? 'text-signal-danger' : selected.svi >= 0.6 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                      {selected.svi.toFixed(2)}
                    </span>
                  </div>
                )}
                {!selected.is_live && (
                  <div className="flex justify-between">
                    <span className="text-ash-400">Evac Order</span>
                    <span className={selected.has_order ? 'text-signal-safe' : 'text-signal-danger'}>
                      {selected.has_order ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
                {selected.gap_hours != null && (
                  <div className="flex justify-between">
                    <span className="text-ash-400">Signal Gap</span>
                    <span className={`font-mono ${selected.gap_hours > 12 ? 'text-signal-danger' : 'text-signal-warn'}`}>
                      {selected.gap_hours}h
                    </span>
                  </div>
                )}
                {selected.spread_rate && (
                  <div className="flex justify-between">
                    <span className="text-ash-400">Spread Rate</span>
                    <span className={`capitalize ${selected.spread_rate === 'extreme' ? 'text-signal-danger' : selected.spread_rate === 'rapid' ? 'text-signal-warn' : 'text-ash-300'}`}>
                      {selected.spread_rate}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ash-400">Coords</span>
                  <span className="text-ash-400 text-xs font-mono">{selected.lat.toFixed(2)}, {selected.lng.toFixed(2)}</span>
                </div>
              </div>
              {!selected.is_live && !selected.has_order && (selected.svi ?? 0) >= 0.7 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-signal-danger">
                  <AlertTriangle className="w-3 h-3" />
                  High-vulnerability area with no formal order
                </div>
              )}
              {selected.is_live && (selected.contained_pct ?? 0) < 10 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-signal-danger">
                  <AlertTriangle className="w-3 h-3" />
                  Less than 10% contained — actively spreading
                </div>
              )}
              <button onClick={() => setSelected(null)} className="mt-3 text-ash-600 hover:text-ash-400 text-xs">
                clear selection ✕
              </button>
            </div>
          ) : (
            <div className="card p-4 text-center">
              <Map className="w-8 h-8 text-ash-700 mx-auto mb-2" />
              <div className="text-ash-500 text-xs">Click a marker to see details</div>
            </div>
          )}

          {/* Incident list */}
          <div className="card p-4">
            <div className="text-ash-400 text-xs font-medium mb-3">
              {tab === 'live' ? `Active Fires (${filteredLive.length})` : `Incident Sample (${filteredWids.length})`}
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {(tab === 'live' ? filteredLive : filteredWids)
                .sort((a, b) => b.acres - a.acres)
                .map(fire => {
                  const color = fire.is_live
                    ? (fire.contained_pct ?? 0) < 10 ? '#ef4444' : (fire.contained_pct ?? 0) < 50 ? '#f59e0b' : '#22c55e'
                    : !fire.has_order ? '#ef4444' : (fire.svi ?? 0) >= 0.7 ? '#f59e0b' : '#22c55e'
                  return (
                    <button key={fire.id} onClick={() => setSelected(fire === selected ? null : fire)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs ${selected?.id === fire.id ? 'bg-ash-700' : 'hover:bg-ash-800'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-white truncate">{fire.name}</span>
                        <span className="text-ash-500 ml-auto shrink-0">
                          {fire.acres >= 1000 ? `${(fire.acres / 1000).toFixed(0)}k` : fire.acres} ac
                        </span>
                      </div>
                      {fire.is_live && (
                        <div className="ml-4 text-ash-600 text-xs">{fire.state} · {fire.contained_pct ?? 0}% contained</div>
                      )}
                    </button>
                  )
                })}
              {tab === 'live' && !liveLoading && filteredLive.length === 0 && (
                <div className="text-ash-600 text-xs text-center py-4">No active incidents matching filter</div>
              )}
            </div>
          </div>

          {/* Live resources */}
          <div className="card p-4">
            <div className="text-ash-400 text-xs font-medium mb-3">External Resources</div>
            <div className="space-y-2">
              {[
                { label: 'NIFC Active Fire Map', url: 'https://www.nifc.gov/fire-information/maps', badge: 'Live' },
                { label: 'InciWeb Incident Info', url: 'https://inciweb.nwcg.gov', badge: 'Live' },
                { label: 'NASA FIRMS Fire Map', url: 'https://firms.modaps.eosdis.nasa.gov/map/', badge: 'Satellite' },
                { label: 'CAL FIRE Incidents', url: 'https://www.fire.ca.gov/incidents/', badge: 'CA' },
                { label: 'AirNow Fire & Smoke', url: 'https://fire.airnow.gov', badge: 'AQI' },
                { label: 'WiDS 2025 Dataset', url: 'https://www.kaggle.com/competitions/widsdatathon2025', badge: 'Data' },
              ].map(r => (
                <a key={r.label} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-ash-400 hover:text-signal-info transition-colors group">
                  <ExternalLink className="w-3 h-3 shrink-0 group-hover:text-signal-info" />
                  <span className="flex-1">{r.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${r.badge === 'Live' ? 'bg-signal-danger/20 text-signal-danger' : 'bg-ash-800 text-ash-500'}`}>
                    {r.badge}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WiDS context note */}
      {tab === 'wids' && (
        <div className="card p-4 mt-4 border border-signal-info/20 bg-signal-info/5">
          <div className="text-ash-400 text-xs leading-relaxed space-y-1">
            <p>
              <span className="text-signal-info font-medium">WiDS Dataset overview:</span>{' '}
              {WIDS_STATS.total.toLocaleString()} total incidents (2021–2025) ·{' '}
              {WIDS_STATS.silent.toLocaleString()} ({((WIDS_STATS.silent / WIDS_STATS.total) * 100).toFixed(0)}%) "silent" — no public channel ·{' '}
              {WIDS_STATS.highSviNoOrder.toLocaleString()} high-SVI fires with no evacuation order ·{' '}
              Median signal-to-order delay: <strong>{WIDS_STATS.medianDelayHr}h</strong>
            </p>
            <p>
              <span className="text-signal-warn font-medium">Note:</span>{' '}
              Map shows 25 representative incidents. Full 62,696-row dataset available via Signal Gap and ML Predictor tools. Connect Supabase to enable live querying.
            </p>
          </div>
        </div>
      )}

      {tab === 'live' && liveFetched && !liveLoading && !liveError && (
        <div className="card p-4 mt-4 border border-signal-danger/20 bg-signal-danger/5">
          <p className="text-ash-400 text-xs">
            <span className="text-signal-danger font-medium">Live data:</span>{' '}
            {liveFires.length} active incidents from NIFC EGP (public view) · Cached 10 min ·
            Includes containment %, cause, and daily acreage. Marker color = containment level.
          </p>
        </div>
      )}
    </div>
  )
}

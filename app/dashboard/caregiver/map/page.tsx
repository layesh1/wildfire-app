'use client'
import { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MapPin, AlertTriangle, Clock, Filter, Satellite, TrendingUp, Flame } from 'lucide-react'
import type { FireEvent, FirmsPoint, NifcFire } from './LeafletMap'

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

function sviLabel(svi?: number) {
  if (svi == null) return null
  if (svi > 0.75) return { text: 'High SVI', cls: 'text-signal-danger' }
  if (svi > 0.5) return { text: 'Mod SVI', cls: 'text-signal-warn' }
  return { text: 'Low SVI', cls: 'text-signal-safe' }
}

function EvacuationMapContent() {
  // WiDS static JSON fires (all with lat/lng)
  const [wids, setWids] = useState<any[]>([])
  // NASA FIRMS satellite hotspots
  const [firms, setFirms] = useState<FirmsPoint[]>([])
  const [firmsError, setFirmsError] = useState(false)
  // NIFC current active fires
  const [nifc, setNifc] = useState<NifcFire[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOrders, setFilterOrders] = useState(false)
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')

  useEffect(() => {
    async function load() {
      const [widsRes, firmsRes, nifcRes] = await Promise.allSettled([
        fetch('/data/fire_events_map.json'),
        fetch('/api/fires/firms?days=5'),
        fetch('/api/fires/nifc'),
      ])

      // WiDS static JSON
      if (widsRes.status === 'fulfilled' && widsRes.value.ok) {
        const data = await widsRes.value.json().catch(() => [])
        if (Array.isArray(data)) setWids(data)
      }

      // NASA FIRMS
      if (firmsRes.status === 'fulfilled' && firmsRes.value.ok) {
        const json = await firmsRes.value.json().catch(() => null)
        if (json && Array.isArray(json.data)) setFirms(json.data)
        else setFirmsError(true)
      } else {
        setFirmsError(true)
      }

      // NIFC
      if (nifcRes.status === 'fulfilled' && nifcRes.value.ok) {
        const { data: nifcData } = await nifcRes.value.json().catch(() => ({}))
        if (nifcData) setNifc(nifcData)
      }

      setLoading(false)
    }
    load()
  }, [])

  const showOnlyOrders = filterOrders || filterParam === 'shelter'

  // WiDS fires for sidebar — sorted by SVI descending
  const sidebarFires = [...wids].sort((a, b) => (b.svi_score ?? 0) - (a.svi_score ?? 0))
  const filteredSidebar = showOnlyOrders ? sidebarFires.filter(f => f.evacuation_occurred) : sidebarFires

  // WiDS fires mapped as FireEvent (already have lat/lng)
  const mapFires: FireEvent[] = (showOnlyOrders ? wids.filter(f => f.evacuation_occurred) : wids).map(f => ({
    id: f.geo_event_id,
    incident_name: f.name,
    latitude: f.latitude,
    longitude: f.longitude,
    county: f.county_name,
    state: f.state,
    acres_burned: f.max_acres,
    has_evacuation_order: f.evacuation_occurred ?? false,
    signal_gap_hours: f.hours_to_order,
    svi_score: f.svi_score,
  }))

  const evacuationCount = wids.filter(f => f.evacuation_occurred).length
  const center: [number, number] = [37.5, -119.5]
  const hasData = mapFires.length > 0 || firms.length > 0 || nifc.length > 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <MapPin className="w-4 h-4" />
          CAREGIVER · EVACUATION MAP
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Evacuation Map</h1>
        <p className="text-ash-400 text-sm">
          WiDS dataset fires · NASA FIRMS satellite hotspots · NIFC current incidents · CDC SVI vulnerability scoring
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-white font-bold text-2xl">{loading ? '—' : wids.length.toLocaleString()}</div>
          <div className="text-ash-400 text-xs mt-0.5">WiDS fires (with coords)</div>
          <div className="text-ash-600 text-xs">of 62,696 total</div>
        </div>
        <div className="card p-4">
          <div className="text-signal-danger font-bold text-2xl">{loading ? '—' : evacuationCount}</div>
          <div className="text-ash-400 text-xs mt-0.5">With evacuation orders</div>
          <div className="text-ash-600 text-xs">from WiDS dataset</div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <Satellite className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
          <div>
            <div className="text-amber-400 font-bold text-2xl">{loading ? '—' : firms.length}</div>
            <div className="text-ash-400 text-xs mt-0.5">NASA FIRMS hotspots</div>
            <div className="text-ash-600 text-xs">{firmsError ? 'Key not configured' : 'Last 7d · VIIRS'}</div>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <Flame className="w-4 h-4 text-signal-danger mt-1 shrink-0" />
          <div>
            <div className="text-signal-danger font-bold text-2xl">{loading ? '—' : nifc.length}</div>
            <div className="text-ash-400 text-xs mt-0.5">NIFC active fires</div>
            <div className="text-ash-600 text-xs">Current · live data</div>
          </div>
        </div>
      </div>

      {/* SVI legend */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-ash-900/60 border border-ash-800 rounded-xl text-xs text-ash-400">
        <TrendingUp className="w-4 h-4 text-signal-info shrink-0" />
        <span>
          CDC SVI colors WiDS markers:
          <span className="text-signal-danger ml-2">● High (&gt;0.75)</span>
          <span className="text-signal-warn ml-2">● Moderate (0.5–0.75)</span>
          <span className="text-signal-safe ml-2">● Low (&lt;0.5)</span>
          <span className="text-amber-400 ml-2">● FIRMS hotspot</span>
          <span className="text-red-500 ml-2">● NIFC active fire</span>
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setFilterOrders(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            showOnlyOrders
              ? 'bg-signal-danger/20 border-signal-danger/40 text-signal-danger'
              : 'bg-ash-900 border-ash-700 text-ash-400 hover:text-white hover:border-ash-600'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {showOnlyOrders ? 'Evacuation orders only' : 'Show evacuation orders only'}
        </button>
        {!firmsError && firms.length > 0 && (
          <span className="text-amber-400/70 text-xs flex items-center gap-1">
            <Satellite className="w-3 h-3" /> {firms.length} FIRMS hotspots
          </span>
        )}
        {nifc.length > 0 && (
          <span className="text-red-400/70 text-xs flex items-center gap-1">
            <Flame className="w-3 h-3" /> {nifc.length} NIFC fires
          </span>
        )}
      </div>

      {/* Map + sidebar */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Map */}
        <div className="md:col-span-2 card overflow-hidden" style={{ height: 520 }}>
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
              <span className="text-ash-500 text-sm">Loading WiDS + NASA FIRMS + NIFC…</span>
            </div>
          ) : !hasData ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <MapPin className="w-8 h-8 text-ash-600" />
              <div className="text-ash-400 text-sm font-medium">No fire data available</div>
              <p className="text-ash-600 text-xs max-w-xs">
                Could not load WiDS fire coordinates, NASA FIRMS hotspots, or NIFC current fires.
                Check that public/data/fire_events_map.json is deployed and NASA_FIRMS_API_KEY is set.
              </p>
            </div>
          ) : (
            <LeafletMap fires={mapFires} firms={firmsError ? [] : firms} nifc={nifc} center={center} />
          )}
        </div>

        {/* Sidebar — WiDS fires sorted by SVI desc */}
        <div className="card overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
          <div className="p-4 border-b border-ash-800 shrink-0">
            <h3 className="text-white font-semibold text-sm">
              {showOnlyOrders ? 'Evacuation Orders' : 'WiDS Fires by SVI'}
              <span className="ml-2 text-ash-500 font-normal">{filteredSidebar.length.toLocaleString()}</span>
            </h3>
            <p className="text-ash-600 text-xs mt-0.5">Sorted by vulnerability (highest first)</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 bg-ash-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredSidebar.length === 0 ? (
              <div className="p-6 text-center text-ash-500 text-sm">No incidents found.</div>
            ) : (
              <div className="divide-y divide-ash-800">
                {filteredSidebar.slice(0, 200).map((fire: any) => {
                  const svi = sviLabel(fire.svi_score)
                  return (
                    <div key={fire.geo_event_id} className="p-3 hover:bg-ash-800/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          fire.evacuation_occurred ? 'bg-signal-danger animate-pulse-slow' : 'bg-ember-400'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-white text-xs font-medium truncate">
                            {fire.name || 'Unnamed Incident'}
                          </div>
                          <div className="text-ash-500 text-xs">
                            {fire.county_name && `${fire.county_name}, `}{fire.state}
                            {fire.max_acres && ` · ${Number(fire.max_acres).toLocaleString()} ac`}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {fire.evacuation_occurred && (
                              <span className="text-signal-danger text-xs font-medium">⚠ Evac order</span>
                            )}
                            {svi && (
                              <span className={`text-xs ${svi.cls}`}>{svi.text}</span>
                            )}
                            {fire.hours_to_order != null && !isNaN(fire.hours_to_order) && (
                              <span className="text-ash-600 text-xs">{Number(fire.hours_to_order).toFixed(1)}h delay</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredSidebar.length > 200 && (
                  <div className="p-3 text-center text-ash-600 text-xs">
                    Showing top 200 of {filteredSidebar.length.toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ash-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-signal-danger" />
          WiDS: High SVI / Evacuation order
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-signal-warn" />
          WiDS: Moderate SVI
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-signal-safe" />
          WiDS: Low SVI
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          NASA FIRMS hotspot
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          NIFC active fire
        </div>
      </div>
    </div>
  )
}

export default function EvacuationMapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ash-400">Loading map…</div>}>
      <EvacuationMapContent />
    </Suspense>
  )
}

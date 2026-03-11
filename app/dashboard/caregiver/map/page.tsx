'use client'
import { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MapPin, Clock, Filter, Satellite, TrendingUp, Flame, Layers } from 'lucide-react'
import type { FirmsPoint, NifcFire } from './LeafletMap'

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

function sviLabel(svi?: number) {
  if (svi == null) return null
  if (svi > 0.75) return { text: 'High SVI', cls: 'text-signal-danger' }
  if (svi > 0.5) return { text: 'Mod SVI', cls: 'text-signal-warn' }
  return { text: 'Low SVI', cls: 'text-signal-safe' }
}

type LayerKey = 'firms' | 'nifc'

function LayerToggle({
  active,
  onToggle,
  color,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onToggle: () => void
  color: string
  icon: React.ElementType
  label: string
  count: number | null
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        active
          ? `border-${color}/50 bg-${color}/10 text-white`
          : 'border-ash-700 bg-ash-900 text-ash-500 hover:text-ash-300 hover:border-ash-600'
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${active ? `bg-${color}` : 'bg-ash-600'}`} />
      <Icon className="w-3 h-3" />
      {label}
      {count !== null && (
        <span className={`ml-0.5 ${active ? 'text-ash-300' : 'text-ash-600'}`}>
          ({count.toLocaleString()})
        </span>
      )}
    </button>
  )
}

function EvacuationMapContent() {
  const [wids, setWids] = useState<any[]>([])
  const [firms, setFirms] = useState<FirmsPoint[]>([])
  const [firmsError, setFirmsError] = useState(false)
  const [nifc, setNifc] = useState<NifcFire[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOrders, setFilterOrders] = useState(false)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    firms: true,
    nifc: true,
  })
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')

  function toggleLayer(key: LayerKey) {
    setLayers(l => ({ ...l, [key]: !l[key] }))
  }

  useEffect(() => {
    async function load() {
      const [widsRes, firmsRes, nifcRes] = await Promise.allSettled([
        fetch('/data/fire_events_map.json'),
        fetch('/api/fires/firms?days=5'),
        fetch('/api/fires/nifc'),
      ])

      if (widsRes.status === 'fulfilled' && widsRes.value.ok) {
        const data = await widsRes.value.json().catch(() => [])
        if (Array.isArray(data)) setWids(data)
      }

      if (firmsRes.status === 'fulfilled' && firmsRes.value.ok) {
        const json = await firmsRes.value.json().catch(() => null)
        if (json && Array.isArray(json.data)) setFirms(json.data)
        else setFirmsError(true)
      } else {
        setFirmsError(true)
      }

      if (nifcRes.status === 'fulfilled' && nifcRes.value.ok) {
        const json = await nifcRes.value.json().catch(() => ({}))
        if (json?.data) setNifc(json.data)
      }

      setLoading(false)
    }
    load()
  }, [])

  const showOnlyOrders = filterOrders || filterParam === 'shelter'
  const sidebarFires = [...wids]
    .sort((a, b) => (b.svi_score ?? 0) - (a.svi_score ?? 0))
  const filteredSidebar = showOnlyOrders
    ? sidebarFires.filter(f => f.evacuation_occurred)
    : sidebarFires

  const evacuationCount = wids.filter(f => f.evacuation_occurred).length
  const hasLiveData = firms.length > 0 || nifc.length > 0
  const center: [number, number] = [37.5, -119.5]

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
          Live satellite detections (NASA FIRMS) · Current incident reports (NIFC) · Historical context in sidebar
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-white font-bold text-2xl">{loading ? '—' : wids.length.toLocaleString()}</div>
          <div className="text-ash-400 text-xs mt-0.5">Historical incidents</div>
          <div className="text-ash-600 text-xs">WiDS dataset · sidebar</div>
        </div>
        <div className="card p-4">
          <div className="text-signal-danger font-bold text-2xl">{loading ? '—' : evacuationCount}</div>
          <div className="text-ash-400 text-xs mt-0.5">With evacuation orders</div>
          <div className="text-ash-600 text-xs">from historical dataset</div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <Satellite className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
          <div>
            <div className="text-amber-400 font-bold text-2xl">{loading ? '—' : firms.length}</div>
            <div className="text-ash-400 text-xs mt-0.5">FIRMS hotspots</div>
            <div className="text-ash-600 text-xs">{firmsError ? 'API error' : 'Last 5 days · VIIRS live'}</div>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <Flame className="w-4 h-4 text-signal-danger mt-1 shrink-0" />
          <div>
            <div className="text-signal-danger font-bold text-2xl">{loading ? '—' : nifc.length}</div>
            <div className="text-ash-400 text-xs mt-0.5">NIFC active fires</div>
            <div className="text-ash-600 text-xs">Current incident reports</div>
          </div>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-ash-900/60 border border-ash-800 rounded-xl">
        <Layers className="w-4 h-4 text-ash-500 shrink-0" />
        <span className="text-ash-500 text-xs mr-1">Map layers:</span>
        <button
          onClick={() => toggleLayer('firms')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            layers.firms
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              : 'border-ash-700 bg-ash-900 text-ash-500 hover:text-ash-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${layers.firms ? 'bg-amber-400' : 'bg-ash-600'}`} />
          <Satellite className="w-3 h-3" />
          NASA FIRMS
          {!loading && <span className="text-ash-400 ml-0.5">({firms.length.toLocaleString()})</span>}
        </button>
        <button
          onClick={() => toggleLayer('nifc')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            layers.nifc
              ? 'border-red-500/50 bg-red-500/10 text-red-300'
              : 'border-ash-700 bg-ash-900 text-ash-500 hover:text-ash-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${layers.nifc ? 'bg-red-500' : 'bg-ash-600'}`} />
          <Flame className="w-3 h-3" />
          NIFC Active Fires
          {!loading && <span className="text-ash-400 ml-0.5">({nifc.length})</span>}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-ash-600" />
          <span className="text-ash-600 text-xs">Live data only · historical fires in sidebar</span>
        </div>
      </div>

      {/* Sidebar filter */}
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
          {showOnlyOrders ? 'Showing evacuation orders only' : 'Filter: evacuation orders only'}
        </button>
      </div>

      {/* Map + sidebar */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 card overflow-hidden" style={{ height: 520 }}>
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
              <span className="text-ash-500 text-sm">Loading live fire data…</span>
            </div>
          ) : !hasLiveData ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <MapPin className="w-8 h-8 text-ash-600" />
              <div className="text-ash-400 text-sm font-medium">No live fire data available</div>
              <p className="text-ash-600 text-xs max-w-xs">
                {firmsError
                  ? 'NASA FIRMS API unavailable — check that NASA_FIRMS_API_KEY is set in environment variables.'
                  : 'No active fire detections in the last 5 days and no current NIFC incidents.'}
              </p>
            </div>
          ) : (
            <LeafletMap
              firms={firms}
              nifc={nifc}
              showFirms={layers.firms}
              showNifc={layers.nifc}
              center={center}
            />
          )}
        </div>

        {/* Sidebar — WiDS historical */}
        <div className="card overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
          <div className="p-4 border-b border-ash-800 shrink-0">
            <h3 className="text-white font-semibold text-sm">
              {showOnlyOrders ? 'Evacuation Orders' : 'Historical Incidents'}
              <span className="ml-2 text-ash-500 font-normal">{filteredSidebar.length.toLocaleString()}</span>
            </h3>
            <p className="text-ash-600 text-xs mt-0.5">WiDS dataset · sorted by vulnerability</p>
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
                          fire.evacuation_occurred ? 'bg-signal-danger' : 'bg-ember-400'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-white text-xs font-medium truncate">
                            {fire.name || 'Unnamed Incident'}
                          </div>
                          <div className="text-ash-500 text-xs">
                            {fire.county_name && `${fire.county_name}, `}{fire.state}
                            {fire.max_acres ? ` · ${Number(fire.max_acres).toLocaleString()} ac` : ''}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {fire.evacuation_occurred && (
                              <span className="text-signal-danger text-xs font-medium">⚠ Evac order</span>
                            )}
                            {svi && <span className={`text-xs ${svi.cls}`}>{svi.text}</span>}
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
                    Showing 200 of {filteredSidebar.length.toLocaleString()} — use filter to narrow results
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
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          NASA FIRMS hotspot cluster
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          NIFC active fire
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-signal-danger" />
          Historical: evac order / high SVI
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ember-400" />
          Historical: low SVI
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

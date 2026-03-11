'use client'
import { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MapPin, AlertTriangle, Clock, Filter } from 'lucide-react'

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

interface Fire {
  id: string
  incident_name?: string
  latitude: number
  longitude: number
  county?: string
  state?: string
  acres_burned?: number
  has_evacuation_order: boolean
  signal_gap_hours?: number
}

function EvacuationMapContent() {
  const [fires, setFires] = useState<Fire[]>([])
  const [loading, setLoading] = useState(true)
  const [filterOrders, setFilterOrders] = useState(false)
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/fires?limit=200')
        const { data } = await res.json()
        if (data) setFires(data.filter((f: Fire) => f.latitude && f.longitude))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const showOnlyOrders = filterOrders || filterParam === 'shelter'
  const displayed = showOnlyOrders ? fires.filter(f => f.has_evacuation_order) : fires
  const ordersCount = fires.filter(f => f.has_evacuation_order).length
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
          Live fire locations and active evacuation orders. Click a marker for details.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-signal-danger shrink-0" />
          <div>
            <div className="text-white font-bold text-xl">{loading ? '—' : ordersCount}</div>
            <div className="text-ash-400 text-xs">Active orders</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-ember-400 shrink-0" />
          <div>
            <div className="text-white font-bold text-xl">{loading ? '—' : fires.length}</div>
            <div className="text-ash-400 text-xs">Total incidents</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-signal-warn shrink-0" />
          <div>
            <div className="text-white font-bold text-xl">11.5h</div>
            <div className="text-ash-400 text-xs">Median alert delay</div>
          </div>
        </div>
      </div>

      {/* Filter */}
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
        {showOnlyOrders && (
          <span className="text-ash-500 text-sm">{ordersCount} active orders</span>
        )}
      </div>

      {/* Map + list */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Map */}
        <div className="md:col-span-2 card overflow-hidden" style={{ height: 500 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
            </div>
          ) : (
            <LeafletMap fires={displayed} center={center} />
          )}
        </div>

        {/* Fire list */}
        <div className="card overflow-hidden flex flex-col" style={{ maxHeight: 500 }}>
          <div className="p-4 border-b border-ash-800 shrink-0">
            <h3 className="text-white font-semibold text-sm">
              {showOnlyOrders ? 'Evacuation Orders' : 'All Incidents'}
              <span className="ml-2 text-ash-500 font-normal">{displayed.length}</span>
            </h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-ash-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="p-6 text-center text-ash-500 text-sm">No incidents found.</div>
            ) : (
              <div className="divide-y divide-ash-800">
                {displayed.slice(0, 50).map(fire => (
                  <div key={fire.id} className="p-3 hover:bg-ash-800/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        fire.has_evacuation_order ? 'bg-signal-danger animate-pulse-slow' : 'bg-ember-400'
                      }`} />
                      <div className="min-w-0">
                        <div className="text-white text-xs font-medium truncate">
                          {fire.incident_name || 'Unnamed Incident'}
                        </div>
                        <div className="text-ash-500 text-xs">
                          {fire.county && `${fire.county}, `}{fire.state}
                        </div>
                        {fire.has_evacuation_order && (
                          <div className="text-signal-danger text-xs font-medium mt-0.5">⚠ Evacuation order</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-6 text-xs text-ash-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-signal-danger" />
          Active evacuation order
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ember-400" />
          Fire incident (no order)
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

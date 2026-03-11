'use client'
import { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MapPin, AlertTriangle, Clock, Filter, Satellite, TrendingUp } from 'lucide-react'
import type { FireEvent, FirmsPoint } from './LeafletMap'

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

function sviLabel(svi?: number) {
  if (svi == null) return null
  if (svi > 0.75) return { text: 'High SVI', cls: 'text-signal-danger' }
  if (svi > 0.5) return { text: 'Mod SVI', cls: 'text-signal-warn' }
  return { text: 'Low SVI', cls: 'text-signal-safe' }
}

function EvacuationMapContent() {
  // WiDS dataset fires (all rows, for sidebar)
  const [allFires, setAllFires] = useState<any[]>([])
  // Only fires with lat/lng (for map pins)
  const [mappableFires, setMappableFires] = useState<FireEvent[]>([])
  // NASA FIRMS satellite hotspots
  const [firms, setFirms] = useState<FirmsPoint[]>([])
  const [firmsError, setFirmsError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterOrders, setFilterOrders] = useState(false)
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')

  useEffect(() => {
    async function load() {
      // Fetch WiDS fire events (Supabase) — increase limit to get real counts
      const firesRes = await fetch('/api/fires?limit=500').catch(() => null)
      if (firesRes?.ok) {
        const { data } = await firesRes.json()
        if (data) {
          setAllFires(data)
          setMappableFires(data.filter((f: any) => f.latitude && f.longitude))
        }
      }

      // Fetch NASA FIRMS satellite hotspots (US, last 1 day)
      const firmsRes = await fetch('/api/fires/firms?days=7').catch(() => null)
      if (firmsRes?.ok) {
        const { data: firmsData } = await firmsRes.json()
        if (firmsData) setFirms(firmsData)
        else setFirmsError(true)
      } else {
        setFirmsError(true)
      }

      setLoading(false)
    }
    load()
  }, [])

  const showOnlyOrders = filterOrders || filterParam === 'shelter'
  const sidebarFires = showOnlyOrders
    ? allFires.filter(f => f.has_evacuation_order)
    : allFires
  const mapFires = showOnlyOrders
    ? mappableFires.filter(f => f.has_evacuation_order)
    : mappableFires

  const ordersCount = allFires.filter(f => f.has_evacuation_order).length
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
          WiDS dataset fires · NASA FIRMS satellite hotspots · CDC SVI vulnerability scoring
        </p>
      </div>

      {/* Stats — dataset totals + live counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-white font-bold text-2xl">{loading ? '—' : allFires.length.toLocaleString()}</div>
          <div className="text-ash-400 text-xs mt-0.5">WiDS incidents loaded</div>
          <div className="text-ash-600 text-xs">of 62,696 total</div>
        </div>
        <div className="card p-4">
          <div className="text-signal-danger font-bold text-2xl">{loading ? '—' : ordersCount}</div>
          <div className="text-ash-400 text-xs mt-0.5">With evacuation orders</div>
          <div className="text-ash-600 text-xs">108 in full dataset</div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <Satellite className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
          <div>
            <div className="text-amber-400 font-bold text-2xl">{loading ? '—' : firms.length}</div>
            <div className="text-ash-400 text-xs mt-0.5">NASA FIRMS hotspots</div>
            <div className="text-ash-600 text-xs">{firmsError ? 'Key not configured' : 'Last 24h · VIIRS'}</div>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <Clock className="w-4 h-4 text-signal-warn mt-1 shrink-0" />
          <div>
            <div className="text-signal-warn font-bold text-2xl">11.5h</div>
            <div className="text-ash-400 text-xs mt-0.5">Median alert delay</div>
            <div className="text-ash-600 text-xs">Signal → formal order</div>
          </div>
        </div>
      </div>

      {/* SVI note */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-ash-900/60 border border-ash-800 rounded-xl text-xs text-ash-400">
        <TrendingUp className="w-4 h-4 text-signal-info shrink-0" />
        <span>
          CDC SVI (Social Vulnerability Index) colors fire markers:
          <span className="text-signal-danger ml-2">● High (&gt;0.75)</span>
          <span className="text-signal-warn ml-2">● Moderate (0.5–0.75)</span>
          <span className="text-signal-safe ml-2">● Low (&lt;0.5)</span>
          <span className="text-signal-danger ml-2">● Red outline = evacuation order</span>
        </span>
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
        {!firmsError && firms.length > 0 && (
          <span className="text-amber-400/70 text-xs flex items-center gap-1">
            <Satellite className="w-3 h-3" /> {firms.length} NASA FIRMS hotspots on map
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
              <span className="text-ash-500 text-sm">Loading WiDS data + NASA FIRMS…</span>
            </div>
          ) : firms.length === 0 && mappableFires.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <MapPin className="w-8 h-8 text-ash-600" />
              <div className="text-ash-400 text-sm font-medium">
                {firmsError ? 'NASA FIRMS unavailable' : 'No active fire detections in last 7 days'}
              </div>
              <p className="text-ash-600 text-xs max-w-xs">
                {firmsError
                  ? 'Check that NASA_FIRMS_API_KEY is set in Vercel environment variables.'
                  : 'NASA FIRMS satellite data shows no hotspots in the continental US this week. The WiDS dataset fires are listed in the sidebar.'}
              </p>
            </div>
          ) : (
            <LeafletMap fires={mapFires} firms={firmsError ? [] : firms} center={center} />
          )}
        </div>

        {/* Sidebar — all WiDS fires (no lat/lng filter) */}
        <div className="card overflow-hidden flex flex-col" style={{ maxHeight: 520 }}>
          <div className="p-4 border-b border-ash-800 shrink-0">
            <h3 className="text-white font-semibold text-sm">
              {showOnlyOrders ? 'Evacuation Orders' : 'WiDS Incidents'}
              <span className="ml-2 text-ash-500 font-normal">{sidebarFires.length.toLocaleString()}</span>
            </h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 bg-ash-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sidebarFires.length === 0 ? (
              <div className="p-6 text-center text-ash-500 text-sm">No incidents found.</div>
            ) : (
              <div className="divide-y divide-ash-800">
                {sidebarFires.slice(0, 100).map((fire: any) => {
                  const svi = sviLabel(fire.svi_score)
                  return (
                    <div key={fire.id} className="p-3 hover:bg-ash-800/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          fire.has_evacuation_order ? 'bg-signal-danger animate-pulse-slow' : 'bg-ember-400'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-white text-xs font-medium truncate">
                            {fire.incident_name || 'Unnamed Incident'}
                          </div>
                          <div className="text-ash-500 text-xs">
                            {fire.county && `${fire.county}, `}{fire.state}
                            {fire.acres_burned && ` · ${fire.acres_burned.toLocaleString()} ac`}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {fire.has_evacuation_order && (
                              <span className="text-signal-danger text-xs font-medium">⚠ Evac order</span>
                            )}
                            {svi && (
                              <span className={`text-xs ${svi.cls}`}>{svi.text}</span>
                            )}
                            {fire.signal_gap_hours != null && (
                              <span className="text-ash-600 text-xs">{fire.signal_gap_hours.toFixed(1)}h gap</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ash-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-signal-danger" />
          Evacuation order
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-signal-warn" />
          High vulnerability (SVI &gt;0.5)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ember-400" />
          Fire (low SVI / no data)
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          NASA FIRMS hotspot
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

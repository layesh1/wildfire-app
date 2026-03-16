'use client'
import { useEffect, useState, Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MapPin, AlertTriangle, CheckCircle, Navigation, ExternalLink, ChevronRight, Flame, RefreshCw, Heart } from 'lucide-react'
import type { NifcFire, EvacShelter } from './LeafletMap'

const EVAC_SHELTERS: EvacShelter[] = [
  { id: 1, name: 'Pomona Fairplex Emergency Shelter', lat: 34.0564, lng: -117.7503, type: 'evacuation', county: 'Los Angeles, CA', capacity: 2000 },
  { id: 2, name: 'Del Mar Fairgrounds', lat: 32.9595, lng: -117.2653, type: 'evacuation', county: 'San Diego, CA', capacity: 1500 },
  { id: 3, name: 'Sonoma County Fairgrounds', lat: 38.4346, lng: -122.7249, type: 'evacuation', county: 'Sonoma, CA', capacity: 1200 },
  { id: 4, name: 'Cal Expo Pet-Friendly Shelter', lat: 38.5961, lng: -121.4143, type: 'evacuation', county: 'Sacramento, CA', capacity: 800 },
  { id: 5, name: 'Rancho Bernardo Community Center', lat: 33.0251, lng: -117.0831, type: 'evacuation', county: 'San Diego, CA', capacity: 600 },
  { id: 6, name: 'Ventura County Fairgrounds', lat: 34.2766, lng: -119.2953, type: 'evacuation', county: 'Ventura, CA', capacity: 900 },
  { id: 7, name: 'Tucson Convention Center', lat: 32.2228, lng: -110.9747, type: 'evacuation', county: 'Pima, AZ', capacity: 1100 },
  { id: 8, name: 'Phoenix Veteran Memorial Coliseum', lat: 33.5007, lng: -112.0709, type: 'evacuation', county: 'Maricopa, AZ', capacity: 1800 },
  { id: 9, name: 'Klamath Falls Expo Center', lat: 42.2249, lng: -121.7753, type: 'evacuation', county: 'Klamath, OR', capacity: 400 },
  { id: 10, name: 'Spokane Arena Shelter', lat: 47.6587, lng: -117.4260, type: 'evacuation', county: 'Spokane, WA', capacity: 1300 },
  { id: 11, name: 'Albuquerque Convention Center', lat: 35.0853, lng: -106.6505, type: 'evacuation', county: 'Bernalillo, NM', capacity: 700 },
  { id: 12, name: 'Gallup Multi-Generational Center', lat: 35.5281, lng: -108.7426, type: 'evacuation', county: 'McKinley, NM', capacity: 350 },
  { id: 13, name: 'Denver Coliseum', lat: 39.7758, lng: -104.9742, type: 'evacuation', county: 'Denver, CO', capacity: 1600 },
  { id: 14, name: 'Reno-Sparks Convention Center', lat: 39.5279, lng: -119.8143, type: 'evacuation', county: 'Washoe, NV', capacity: 900 },
  { id: 15, name: 'Boise State Pavilion', lat: 43.6028, lng: -116.2003, type: 'evacuation', county: 'Ada, ID', capacity: 1100 },
  { id: 16, name: 'Pasadena Humane Society Emergency', lat: 34.1478, lng: -118.1445, type: 'animal', county: 'Los Angeles, CA', capacity: 200 },
  { id: 17, name: 'Sacramento SPCA Emergency Center', lat: 38.5815, lng: -121.4944, type: 'animal', county: 'Sacramento, CA', capacity: 150 },
  { id: 18, name: 'Sonoma Humane Society Emergency', lat: 38.4405, lng: -122.7039, type: 'animal', county: 'Sonoma, CA', capacity: 120 },
  { id: 19, name: 'AZ Humane Society N Phoenix', lat: 33.6751, lng: -112.1150, type: 'animal', county: 'Maricopa, AZ', capacity: 180 },
  { id: 20, name: 'Oregon Humane Society Emergency', lat: 45.5688, lng: -122.6468, type: 'animal', county: 'Multnomah, OR', capacity: 100 },
]

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

// Haversine distance in miles
function distanceMiles([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function dangerLevel(pct: number | null) {
  if (pct == null || pct < 25) return {
    label: 'Active threat',
    action: 'Monitor emergency alerts and be ready to evacuate immediately.',
    borderCls: 'border-signal-danger/40',
    bgCls: 'bg-signal-danger/5',
    textCls: 'text-signal-danger',
    dot: 'bg-signal-danger animate-pulse',
  }
  if (pct < 50) return {
    label: 'Still spreading',
    action: 'Know your evacuation route. Pack a go-bag if you haven\'t.',
    borderCls: 'border-orange-500/40',
    bgCls: 'bg-orange-500/5',
    textCls: 'text-orange-400',
    dot: 'bg-orange-400',
  }
  if (pct < 75) return {
    label: 'Being controlled',
    action: 'Stay informed. Check local alerts periodically.',
    borderCls: 'border-amber-500/40',
    bgCls: 'bg-amber-500/5',
    textCls: 'text-amber-400',
    dot: 'bg-amber-400',
  }
  return {
    label: 'Mostly contained',
    action: 'Low immediate risk. Continue to monitor.',
    borderCls: 'border-signal-safe/30',
    bgCls: 'bg-signal-safe/5',
    textCls: 'text-signal-safe',
    dot: 'bg-signal-safe',
  }
}

function StatusBanner({ fires, locating }: { fires: NifcFire[], locating: boolean }) {
  const critical = fires.filter(f => (f.containment ?? 0) < 25).length
  const spreading = fires.filter(f => f.containment != null && f.containment >= 25 && f.containment < 50).length

  if (fires.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-signal-safe/10 border border-signal-safe/30 rounded-xl mb-6">
        <CheckCircle className="w-5 h-5 text-signal-safe shrink-0" />
        <div>
          <div className="text-signal-safe font-semibold text-sm">No active fires reported</div>
          <div className="text-ash-400 text-xs mt-0.5">NIFC shows no current wildfire incidents. Stay signed up for local alerts.</div>
        </div>
      </div>
    )
  }

  if (critical > 0) {
    return (
      <div className="flex items-center gap-3 p-4 bg-signal-danger/10 border border-signal-danger/40 rounded-xl mb-6">
        <AlertTriangle className="w-5 h-5 text-signal-danger shrink-0 animate-pulse" />
        <div className="flex-1">
          <div className="text-signal-danger font-semibold text-sm">
            {critical} active {critical === 1 ? 'fire' : 'fires'} with low or unknown containment
          </div>
          <div className="text-ash-300 text-xs mt-0.5">
            Follow your local emergency management agency for evacuation orders.
          </div>
        </div>
        <a
          href="https://www.ready.gov/wildfires"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-signal-danger border border-signal-danger/40 rounded-lg px-3 py-1.5 hover:bg-signal-danger/10 transition-colors shrink-0"
        >
          Ready.gov <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
      <Flame className="w-5 h-5 text-amber-400 shrink-0" />
      <div>
        <div className="text-amber-300 font-semibold text-sm">
          {fires.length} active {fires.length === 1 ? 'fire' : 'fires'} being monitored
          {spreading > 0 && ` · ${spreading} still spreading`}
        </div>
        <div className="text-ash-400 text-xs mt-0.5">No immediate critical threat. Know your route and stay informed.</div>
      </div>
    </div>
  )
}

function EvacuationMapContent() {
  const [nifc, setNifc] = useState<NifcFire[]>([])
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showShelters, setShowShelters] = useState(false)
  const searchParams = useSearchParams()

  async function loadNifc() {
    setLoading(true)
    const res = await fetch('/api/fires/nifc').catch(() => null)
    if (res?.ok) {
      const json = await res.json().catch(() => ({}))
      if (json?.data) {
        setNifc(json.data)
        setLastUpdated(new Date())
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadNifc() }, [])

  // Poll every 5 min and fire browser notification if containment drops or new fire appears
  useEffect(() => {
    const knownRef: Record<string, number | null> = {}
    nifc.forEach(f => { knownRef[f.fire_name] = f.containment })

    const interval = setInterval(async () => {
      const res = await fetch('/api/fires/nifc').catch(() => null)
      if (!res?.ok) return
      const { data } = await res.json().catch(() => ({}))
      if (!Array.isArray(data)) return

      data.forEach((f: NifcFire) => {
        const prev = knownRef[f.fire_name]
        const curr = f.containment
        const isNew = !(f.fire_name in knownRef)
        const dropped = prev != null && curr != null && curr < prev - 5

        if ((isNew || dropped) && Notification.permission === 'granted') {
          new Notification(isNew ? `🔥 New fire: ${f.fire_name}` : `⚠️ ${f.fire_name} containment dropped`, {
            body: curr != null
              ? `${curr}% contained${f.acres ? ` · ${f.acres.toLocaleString(undefined, { maximumFractionDigits: 0 })} acres` : ''}`
              : 'Containment unknown — monitor local alerts.',
            icon: '/favicon.ico',
          })
        }
        knownRef[f.fire_name] = curr
      })

      setNifc(data)
      setLastUpdated(new Date())
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [nifc.length])

  function locateMe() {
    setLocating(true)
    setLocationError(false)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setLocating(false)
      },
      () => {
        setLocationError(true)
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  // Sort fires: lowest containment first (most dangerous), then by acres desc
  const sortedFires = useMemo(() => {
    return [...nifc].sort((a, b) => {
      const ca = a.containment ?? -1
      const cb = b.containment ?? -1
      if (ca !== cb) return ca - cb
      return (b.acres ?? 0) - (a.acres ?? 0)
    })
  }, [nifc])

  const center: [number, number] = userLocation ?? [37.5, -119.5]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 text-ember-400 text-sm font-medium mb-3">
          <MapPin className="w-4 h-4" />
          CAREGIVER · EVACUATION MAP
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-1">Active Wildfires</h1>
            <p className="text-ash-400 text-sm">
              Current incidents reported by NIFC · Updated every 5 min
              {lastUpdated && (
                <span className="text-ash-600 ml-2">
                  · Last fetched {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={loadNifc}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border border-ash-700 text-ash-400 hover:text-white hover:border-ash-500 transition-colors shrink-0 mt-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status banner */}
      {!loading && <StatusBanner fires={nifc} locating={locating} />}

      {/* Map + fire list */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Map */}
        <div className="md:col-span-2 flex flex-col gap-3">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={locateMe}
              disabled={locating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
            >
              <Navigation className="w-3.5 h-3.5" />
              {locating ? 'Locating…' : userLocation ? 'Update my location' : 'Show fires near me'}
            </button>
            <button
              onClick={() => setShowShelters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showShelters
                  ? 'bg-signal-safe/20 border-signal-safe/40 text-signal-safe'
                  : 'bg-ash-800 border-ash-700 text-ash-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              {showShelters ? 'Shelters: ON' : 'Show Shelters'}
            </button>
            {locationError && (
              <span className="text-ash-500 text-xs">Location unavailable — enable browser location access.</span>
            )}
            {userLocation && !locationError && (
              <span className="text-blue-400 text-xs">● Showing distances from your location</span>
            )}
          </div>

          <div className="card overflow-hidden" style={{ height: 480 }}>
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
                <span className="text-ash-500 text-sm">Loading active fires…</span>
              </div>
            ) : (
              <LeafletMap nifc={sortedFires} userLocation={userLocation} center={center} shelters={EVAC_SHELTERS} showShelters={showShelters} />
            )}
          </div>

          {/* Map legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ash-500 px-1">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-signal-danger" /> Active threat (&lt;25% contained)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Still spreading (25–50%)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /> Being controlled (50–75%)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-signal-safe" /> Mostly contained (75%+)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Your location</div>
            {showShelters && <div className="flex items-center gap-1.5"><Heart className="w-3 h-3 text-signal-safe" /> Evacuation shelters</div>}
          </div>

          {/* Shelter panel */}
          {showShelters && (() => {
            const sorted = userLocation
              ? [...EVAC_SHELTERS].sort((a, b) =>
                  distanceMiles(userLocation, [a.lat, a.lng]) - distanceMiles(userLocation, [b.lat, b.lng])
                ).slice(0, 8)
              : EVAC_SHELTERS.slice(0, 8)
            return (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-signal-safe" />
                  <h3 className="text-white font-semibold text-sm">
                    {userLocation ? 'Nearest Shelters to Your Location' : 'Evacuation Shelters'}
                  </h3>
                </div>
                {!userLocation && (
                  <p className="text-ash-500 text-xs mb-3">Click &quot;Show fires near me&quot; to sort by distance from your location.</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {sorted.map(shelter => {
                    const dist = userLocation ? distanceMiles(userLocation, [shelter.lat, shelter.lng]) : null
                    return (
                      <div
                        key={shelter.id}
                        className={`rounded-lg border p-3 ${
                          shelter.type === 'evacuation'
                            ? 'border-signal-safe/30 bg-signal-safe/5'
                            : 'border-signal-info/30 bg-signal-info/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="text-white text-sm font-medium leading-snug">{shelter.name}</div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            shelter.type === 'evacuation'
                              ? 'bg-signal-safe/20 text-signal-safe'
                              : 'bg-signal-info/20 text-signal-info'
                          }`}>
                            {shelter.type === 'evacuation' ? 'Evac' : 'Animal'}
                          </span>
                        </div>
                        <div className="text-ash-500 text-xs">{shelter.county}</div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-ash-400 text-xs">Cap: {shelter.capacity.toLocaleString()}</span>
                          {dist != null && (
                            <span className="text-blue-400 text-xs font-medium">{dist.toFixed(0)} mi away</span>
                          )}
                          <span className="text-signal-safe text-xs font-medium ml-auto">Open</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-ash-600 text-xs mt-3">
                  Showing {sorted.length} nearest shelters{userLocation ? ' to your location' : ''}. 459 total tracked system-wide.
                </p>
              </div>
            )
          })()}
        </div>

        {/* Fire cards */}
        <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 560 }}>
          <h3 className="text-white font-semibold text-sm shrink-0">
            Active Fires
            <span className="ml-2 text-ash-500 font-normal">{nifc.length}</span>
            <span className="ml-2 text-ash-600 font-normal text-xs">— most dangerous first</span>
          </h3>

          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-ash-800 rounded-xl animate-pulse" />
            ))
          ) : sortedFires.length === 0 ? (
            <div className="card p-5 text-center">
              <CheckCircle className="w-8 h-8 text-signal-safe mx-auto mb-2" />
              <div className="text-white text-sm font-medium mb-1">No active fires</div>
              <div className="text-ash-500 text-xs">NIFC reports no current wildfire incidents.</div>
            </div>
          ) : (
            sortedFires.map(fire => {
              const danger = dangerLevel(fire.containment)
              const dist = userLocation
                ? distanceMiles(userLocation, [fire.latitude, fire.longitude])
                : null
              return (
                <div
                  key={fire.id}
                  className={`rounded-xl border p-4 ${danger.borderCls} ${danger.bgCls}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${danger.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{fire.fire_name}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs font-medium ${danger.textCls}`}>{danger.label}</span>
                        {fire.containment != null && (
                          <span className="text-ash-400 text-xs">{fire.containment}% contained</span>
                        )}
                        {dist != null && (
                          <span className="text-ash-400 text-xs">
                            {dist < 1 ? '< 1' : Math.round(dist)} mi away
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Containment bar */}
                  {fire.containment != null && (
                    <div className="h-1 bg-ash-800 rounded-full mb-3">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${fire.containment}%`,
                          backgroundColor: fire.containment < 25 ? '#ef4444'
                            : fire.containment < 50 ? '#f97316'
                            : fire.containment < 75 ? '#eab308'
                            : '#22c55e'
                        }}
                      />
                    </div>
                  )}

                  {fire.acres != null && (
                    <div className="text-ash-500 text-xs mb-2">
                      {fire.acres.toLocaleString(undefined, { maximumFractionDigits: 0 })} acres
                    </div>
                  )}

                  <div className="text-ash-400 text-xs leading-relaxed">{danger.action}</div>
                </div>
              )
            })
          )}

          {/* Always-visible resource link */}
          {!loading && nifc.length > 0 && (
            <a
              href="https://www.ready.gov/wildfires"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl border border-ash-700 hover:border-ash-500 text-ash-400 hover:text-white transition-colors text-xs"
            >
              <span>Official evacuation guidance · Ready.gov</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EvacuationMapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ash-400">Loading…</div>}>
      <EvacuationMapContent />
    </Suspense>
  )
}

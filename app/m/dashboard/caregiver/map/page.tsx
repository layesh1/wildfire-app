'use client'
import { useEffect, useState, Component, ReactNode, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Layers, Navigation, MapPin, Search, X } from 'lucide-react'

class MapErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Map unavailable</p>
        </div>
      </div>
    )
    return this.props.children
  }
}

const LeafletMap = dynamic(() => import('@/app/dashboard/caregiver/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-500 text-xs">Loading map…</p>
      </div>
    </div>
  ),
})

interface NifcFire {
  id: string; latitude: number; longitude: number; fire_name: string
  acres: number | null; containment: number | null; source: 'nifc_perimeter' | 'nifc_incident'
}

export default function MobileMapPage() {
  const [fires, setFires] = useState<NifcFire[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [searchVal, setSearchVal] = useState('')
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/fires/nifc')
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.data)) setFires(json.data)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  function locateMe() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        if (isFinite(lat) && isFinite(lon)) setUserLocation([lat, lon])
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 10000 }
    )
  }

  function handleSearchChange(v: string) {
    setSearchVal(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&format=json&limit=4&countrycodes=us`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        setSuggestions(data)
      } catch {}
    }, 400)
  }

  function pickSuggestion(s: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(s.lat)
    const lng = parseFloat(s.lon)
    if (isFinite(lat) && isFinite(lng)) {
      setPinnedLocation({ lat, lng, label: s.display_name.split(',')[0] })
      setUserLocation([lat, lng])
    }
    setSearchVal(s.display_name.split(',')[0])
    setSuggestions([])
  }

  const center: [number, number] = userLocation ?? [37.5, -119.5]
  const watchedLocations = pinnedLocation
    ? [{ label: pinnedLocation.label, lat: pinnedLocation.lat, lng: pinnedLocation.lng }]
    : []

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 80px)' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-green-700" />
            <h1 className="font-semibold text-gray-900 text-base">Evac Map</h1>
          </div>
          <button
            onClick={locateMe}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-3 py-1.5 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5" />
            {locating ? 'Locating…' : 'My Location'}
          </button>
        </div>
        {/* Address search / pin */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchVal}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Pin an address or location…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            {(searchVal || pinnedLocation) && (
              <button onClick={() => { setSearchVal(''); setSuggestions([]); setPinnedLocation(null) }}>
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[2000]">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    <div className="font-medium truncate">{s.display_name.split(',')[0]}</div>
                    <div className="text-xs text-gray-400 truncate">{s.display_name.split(',').slice(1, 3).join(',')}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {loading ? 'Loading fires…' : `${fires.length} active fire${fires.length !== 1 ? 's' : ''} shown`}
          {pinnedLocation && <span className="ml-2 text-green-600 font-medium">· Pinned: {pinnedLocation.label}</span>}
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <MapErrorBoundary>
          <LeafletMap
            nifc={fires}
            userLocation={userLocation}
            center={center}
            showShelters
            shelters={[]}
            watchedLocations={watchedLocations}
          />
        </MapErrorBoundary>
      </div>
    </div>
  )
}

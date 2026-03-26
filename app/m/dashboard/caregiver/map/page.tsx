'use client'
import { useEffect, useState, Component, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { Layers, Navigation, MapPin } from 'lucide-react'

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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      try {
        const { data } = await supabase
          .from('nifc_fires')
          .select('id,latitude,longitude,fire_name,acres,containment,source')
          .limit(200)
        if (data) setFires(data)
      } catch {}
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

  const center: [number, number] = userLocation ?? [37.5, -119.5]

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100dvh - 80px)' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
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
        <p className="text-xs text-gray-400 mt-0.5">{fires.length} active fire{fires.length !== 1 ? 's' : ''} shown</p>
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
          />
        </MapErrorBoundary>
      </div>
    </div>
  )
}

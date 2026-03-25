'use client'
import { useEffect, useState, Suspense, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { MapPin, AlertTriangle, CheckCircle, Navigation, ExternalLink, ChevronRight, Flame, RefreshCw, Heart, Maximize2, Minimize2, LayoutTemplate, User, Search, X, Factory } from 'lucide-react'
import type { NifcFire, EvacShelter, WatchedLocation, WindData } from './LeafletMap'
import { HAZARD_FACILITIES } from '@/lib/hazard-facilities'

const EVAC_SHELTERS: EvacShelter[] = [
  // California
  { id: 1, name: 'Pomona Fairplex', lat: 34.0564, lng: -117.7503, type: 'evacuation', county: 'Los Angeles, CA', capacity: 2000 },
  { id: 2, name: 'Del Mar Fairgrounds', lat: 32.9595, lng: -117.2653, type: 'evacuation', county: 'San Diego, CA', capacity: 1500 },
  { id: 3, name: 'Sonoma County Fairgrounds', lat: 38.4346, lng: -122.7249, type: 'evacuation', county: 'Sonoma, CA', capacity: 1200 },
  { id: 4, name: 'Cal Expo (Pet-Friendly)', lat: 38.5961, lng: -121.4143, type: 'evacuation', county: 'Sacramento, CA', capacity: 800 },
  { id: 5, name: 'Ventura County Fairgrounds', lat: 34.2766, lng: -119.2953, type: 'evacuation', county: 'Ventura, CA', capacity: 900 },
  { id: 6, name: 'Santa Barbara County Shelter', lat: 34.4208, lng: -119.6982, type: 'evacuation', county: 'Santa Barbara, CA', capacity: 600 },
  { id: 7, name: 'Butte County Fairgrounds', lat: 39.7285, lng: -121.8375, type: 'evacuation', county: 'Butte, CA', capacity: 700 },
  { id: 8, name: 'Shasta District Fairgrounds', lat: 40.5865, lng: -122.3917, type: 'evacuation', county: 'Shasta, CA', capacity: 500 },
  { id: 9, name: 'Fresno Convention Center', lat: 36.7378, lng: -119.7871, type: 'evacuation', county: 'Fresno, CA', capacity: 1100 },
  { id: 10, name: 'San Bernardino Nat\'l Orange Show', lat: 34.0922, lng: -117.2944, type: 'evacuation', county: 'San Bernardino, CA', capacity: 1300 },
  { id: 11, name: 'Riverside County Fairgrounds', lat: 33.9806, lng: -117.3756, type: 'evacuation', county: 'Riverside, CA', capacity: 900 },
  { id: 12, name: 'Napa Valley Expo', lat: 38.2975, lng: -122.2869, type: 'evacuation', county: 'Napa, CA', capacity: 400 },
  // Arizona
  { id: 13, name: 'Tucson Convention Center', lat: 32.2228, lng: -110.9747, type: 'evacuation', county: 'Pima, AZ', capacity: 1100 },
  { id: 14, name: 'Phoenix Veteran Memorial Coliseum', lat: 33.5007, lng: -112.0709, type: 'evacuation', county: 'Maricopa, AZ', capacity: 1800 },
  { id: 15, name: 'Yavapai College Prescott', lat: 34.5400, lng: -112.4685, type: 'evacuation', county: 'Yavapai, AZ', capacity: 400 },
  { id: 16, name: 'Flagstaff Coconino Center for the Arts', lat: 35.1983, lng: -111.6513, type: 'evacuation', county: 'Coconino, AZ', capacity: 350 },
  // Oregon & Washington
  { id: 17, name: 'Klamath Falls Expo Center', lat: 42.2249, lng: -121.7753, type: 'evacuation', county: 'Klamath, OR', capacity: 400 },
  { id: 18, name: 'Oregon Convention Center', lat: 45.5279, lng: -122.6625, type: 'evacuation', county: 'Multnomah, OR', capacity: 2000 },
  { id: 19, name: 'Jackson County Expo', lat: 42.3265, lng: -122.8756, type: 'evacuation', county: 'Jackson, OR', capacity: 600 },
  { id: 20, name: 'Spokane Arena Shelter', lat: 47.6587, lng: -117.4260, type: 'evacuation', county: 'Spokane, WA', capacity: 1300 },
  { id: 21, name: 'Yakima SunDome', lat: 46.5952, lng: -120.5309, type: 'evacuation', county: 'Yakima, WA', capacity: 800 },
  { id: 22, name: 'Wenatchee Convention Center', lat: 47.4235, lng: -120.3103, type: 'evacuation', county: 'Chelan, WA', capacity: 400 },
  { id: 23, name: 'Tacoma Convention Center', lat: 47.2529, lng: -122.4443, type: 'evacuation', county: 'Pierce, WA', capacity: 900 },
  // Nevada, Idaho, Montana
  { id: 24, name: 'Reno-Sparks Convention Center', lat: 39.5279, lng: -119.8143, type: 'evacuation', county: 'Washoe, NV', capacity: 900 },
  { id: 25, name: 'Las Vegas Convention Center', lat: 36.1317, lng: -115.1519, type: 'evacuation', county: 'Clark, NV', capacity: 3000 },
  { id: 26, name: 'Boise State Pavilion', lat: 43.6028, lng: -116.2003, type: 'evacuation', county: 'Ada, ID', capacity: 1100 },
  { id: 27, name: 'Idaho Falls Civic Auditorium', lat: 43.4927, lng: -112.0408, type: 'evacuation', county: 'Bonneville, ID', capacity: 400 },
  { id: 28, name: 'Missoula County Fairgrounds', lat: 46.8679, lng: -114.0121, type: 'evacuation', county: 'Missoula, MT', capacity: 500 },
  { id: 29, name: 'Billings MetraPark', lat: 45.7779, lng: -108.5007, type: 'evacuation', county: 'Yellowstone, MT', capacity: 700 },
  // New Mexico, Colorado, Utah
  { id: 30, name: 'Albuquerque Convention Center', lat: 35.0853, lng: -106.6505, type: 'evacuation', county: 'Bernalillo, NM', capacity: 700 },
  { id: 31, name: 'Taos County Fairgrounds', lat: 36.4072, lng: -105.5730, type: 'evacuation', county: 'Taos, NM', capacity: 250 },
  { id: 32, name: 'Santa Fe Convention Center', lat: 35.6870, lng: -105.9378, type: 'evacuation', county: 'Santa Fe, NM', capacity: 400 },
  { id: 33, name: 'Denver Coliseum', lat: 39.7758, lng: -104.9742, type: 'evacuation', county: 'Denver, CO', capacity: 1600 },
  { id: 34, name: 'Colorado Springs City Auditorium', lat: 38.8339, lng: -104.8214, type: 'evacuation', county: 'El Paso, CO', capacity: 700 },
  { id: 35, name: 'Salt Palace Convention Center', lat: 40.7608, lng: -111.8910, type: 'evacuation', county: 'Salt Lake, UT', capacity: 1500 },
  { id: 36, name: 'Utah County Fairgrounds', lat: 40.2969, lng: -111.6946, type: 'evacuation', county: 'Utah, UT', capacity: 600 },
  // Texas
  { id: 37, name: 'George R. Brown Convention Ctr', lat: 29.7533, lng: -95.3596, type: 'evacuation', county: 'Harris, TX', capacity: 4000 },
  { id: 38, name: 'Fort Worth Convention Center', lat: 32.7484, lng: -97.3286, type: 'evacuation', county: 'Tarrant, TX', capacity: 1800 },
  { id: 39, name: 'Austin Convention Center', lat: 30.2626, lng: -97.7404, type: 'evacuation', county: 'Travis, TX', capacity: 1200 },
  { id: 40, name: 'San Antonio Freeman Coliseum', lat: 29.4241, lng: -98.4936, type: 'evacuation', county: 'Bexar, TX', capacity: 1500 },
  { id: 41, name: 'Lubbock Civic Center', lat: 33.5779, lng: -101.8552, type: 'evacuation', county: 'Lubbock, TX', capacity: 600 },
  { id: 42, name: 'Amarillo Civic Center', lat: 35.2220, lng: -101.8313, type: 'evacuation', county: 'Potter, TX', capacity: 700 },
  // Southeast / Carolinas
  { id: 43, name: 'Charlotte Convention Center', lat: 35.2271, lng: -80.8431, type: 'evacuation', county: 'Mecklenburg, NC', capacity: 3000 },
  { id: 44, name: 'Cabarrus County Fairgrounds', lat: 35.3882, lng: -80.5496, type: 'evacuation', county: 'Cabarrus, NC', capacity: 800 },
  { id: 45, name: 'NC State Fairgrounds (Wake Co.)', lat: 35.7885, lng: -78.7026, type: 'evacuation', county: 'Wake, NC', capacity: 1200 },
  { id: 46, name: 'WNC Ag Center (Buncombe)', lat: 35.5951, lng: -82.5515, type: 'evacuation', county: 'Buncombe, NC', capacity: 700 },
  { id: 47, name: 'Greensboro Coliseum Complex', lat: 36.0726, lng: -79.7920, type: 'evacuation', county: 'Guilford, NC', capacity: 1500 },
  { id: 48, name: 'Forsyth County Shelter', lat: 36.0998, lng: -80.2442, type: 'evacuation', county: 'Forsyth, NC', capacity: 800 },
  { id: 49, name: 'Columbia Metropolitan Conv Ctr', lat: 34.0007, lng: -81.0348, type: 'evacuation', county: 'Richland, SC', capacity: 1400 },
  { id: 50, name: 'Spartanburg Memorial Auditorium', lat: 34.9496, lng: -81.9320, type: 'evacuation', county: 'Spartanburg, SC', capacity: 600 },
  { id: 51, name: 'Georgia World Congress Center', lat: 33.7573, lng: -84.3963, type: 'evacuation', county: 'Fulton, GA', capacity: 2500 },
  { id: 52, name: 'Floyd County Emergency Shelter', lat: 34.2579, lng: -85.1647, type: 'evacuation', county: 'Floyd, GA', capacity: 500 },
  { id: 53, name: 'Nashville Municipal Auditorium', lat: 36.1687, lng: -86.7816, type: 'evacuation', county: 'Davidson, TN', capacity: 1100 },
  { id: 54, name: 'Knoxville Convention Center', lat: 35.9606, lng: -83.9207, type: 'evacuation', county: 'Knox, TN', capacity: 800 },
  { id: 55, name: 'Huntsville Von Braun Center', lat: 34.7304, lng: -86.5861, type: 'evacuation', county: 'Madison, AL', capacity: 900 },
  { id: 56, name: 'Birmingham-Jefferson Convention', lat: 33.5186, lng: -86.8104, type: 'evacuation', county: 'Jefferson, AL', capacity: 1200 },
  { id: 57, name: 'Virginia Beach Convention Center', lat: 36.8354, lng: -75.9777, type: 'evacuation', county: 'Virginia Beach, VA', capacity: 1100 },
  { id: 58, name: 'Richmond Convention Center', lat: 37.5330, lng: -77.4352, type: 'evacuation', county: 'Richmond, VA', capacity: 900 },
  // Florida
  { id: 59, name: 'Orange County Convention Center', lat: 28.4254, lng: -81.4719, type: 'evacuation', county: 'Orange, FL', capacity: 3000 },
  { id: 60, name: 'Broward Convention Center', lat: 26.1099, lng: -80.1253, type: 'evacuation', county: 'Broward, FL', capacity: 1800 },
  { id: 61, name: 'Tampa Convention Center', lat: 27.9422, lng: -82.4589, type: 'evacuation', county: 'Hillsborough, FL', capacity: 1500 },
  { id: 62, name: 'Leon County Civic Center', lat: 30.4383, lng: -84.2807, type: 'evacuation', county: 'Leon, FL', capacity: 700 },
  // Midwest
  { id: 63, name: 'McCormick Place Chicago', lat: 41.8525, lng: -87.6156, type: 'evacuation', county: 'Cook, IL', capacity: 5000 },
  { id: 64, name: 'Kansas City Convention Center', lat: 39.0997, lng: -94.5786, type: 'evacuation', county: 'Jackson, MO', capacity: 1500 },
  { id: 65, name: 'Minneapolis Convention Center', lat: 44.9737, lng: -93.2732, type: 'evacuation', county: 'Hennepin, MN', capacity: 1800 },
  { id: 66, name: 'Sioux Falls Convention Center', lat: 43.5473, lng: -96.7283, type: 'evacuation', county: 'Minnehaha, SD', capacity: 600 },
  { id: 67, name: 'Bismarck Civic Center', lat: 46.8083, lng: -100.7837, type: 'evacuation', county: 'Burleigh, ND', capacity: 400 },
  // Northeast
  { id: 68, name: 'Boston Convention & Exhibition', lat: 42.3455, lng: -71.0444, type: 'evacuation', county: 'Suffolk, MA', capacity: 2000 },
  { id: 69, name: 'Jacob K. Javits Convention Ctr', lat: 40.7579, lng: -74.0027, type: 'evacuation', county: 'New York, NY', capacity: 4000 },
  { id: 70, name: 'Pennsylvania Convention Center', lat: 39.9535, lng: -75.1599, type: 'evacuation', county: 'Philadelphia, PA', capacity: 2500 },
  // Hawaii & Alaska
  { id: 71, name: 'Hawaii Convention Center', lat: 21.2890, lng: -157.8388, type: 'evacuation', county: 'Honolulu, HI', capacity: 1000 },
  { id: 72, name: 'Maui War Memorial Auditorium', lat: 20.8893, lng: -156.4729, type: 'evacuation', county: 'Maui, HI', capacity: 300 },
  { id: 73, name: 'Egan Convention Center', lat: 61.2181, lng: -149.9003, type: 'evacuation', county: 'Anchorage, AK', capacity: 800 },
  // Animal shelters (nationwide)
  { id: 74, name: 'Pasadena Humane Society', lat: 34.1478, lng: -118.1445, type: 'animal', county: 'Los Angeles, CA', capacity: 200 },
  { id: 75, name: 'Sacramento SPCA', lat: 38.5815, lng: -121.4944, type: 'animal', county: 'Sacramento, CA', capacity: 150 },
  { id: 76, name: 'AZ Humane Society Phoenix', lat: 33.6751, lng: -112.1150, type: 'animal', county: 'Maricopa, AZ', capacity: 180 },
  { id: 77, name: 'Oregon Humane Society', lat: 45.5688, lng: -122.6468, type: 'animal', county: 'Multnomah, OR', capacity: 100 },
  { id: 78, name: 'Humane Society of Charlotte', lat: 35.2559, lng: -80.7993, type: 'animal', county: 'Mecklenburg, NC', capacity: 200 },
  { id: 79, name: 'Cabarrus Animal Shelter', lat: 35.3798, lng: -80.5523, type: 'animal', county: 'Cabarrus, NC', capacity: 120 },
  { id: 80, name: 'Atlanta Humane Society', lat: 33.7815, lng: -84.3791, type: 'animal', county: 'Fulton, GA', capacity: 160 },
  { id: 81, name: 'Houston SPCA', lat: 29.7365, lng: -95.4246, type: 'animal', county: 'Harris, TX', capacity: 250 },
  { id: 82, name: 'Denver Dumb Friends League', lat: 39.6914, lng: -104.9903, type: 'animal', county: 'Denver, CO', capacity: 180 },
  { id: 83, name: 'Washington Humane Society', lat: 38.9072, lng: -77.0369, type: 'animal', county: 'DC', capacity: 150 },
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

interface SavedPerson { id: string; name: string; address: string }

function EvacuationMapContent() {
  const [nifc, setNifc] = useState<NifcFire[]>([])
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showShelters, setShowShelters] = useState(false)
  const [showFacilities, setShowFacilities] = useState(false)
  const [windData, setWindData] = useState<WindData | null>(null)
  const [mapSize, setMapSize] = useState<'compact' | 'default' | 'full'>('default')
  const [mapWidthPct, setMapWidthPct] = useState(65)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  // Person / address monitoring
  const [savedPersons, setSavedPersons] = useState<SavedPerson[]>([])
  const [watchedLocations, setWatchedLocations] = useState<WatchedLocation[]>([])
  const [addressInput, setAddressInput] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')
  const [homeCenter, setHomeCenter] = useState<[number, number] | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('monitored_persons_v2')
      if (raw) setSavedPersons(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (!isDragging) return
    function onMove(e: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100)
      setMapWidthPct(Math.min(85, Math.max(30, pct)))
      setMapSize('compact') // clear preset highlight while dragging
    }
    function onUp() { setIsDragging(false) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  function applyPreset(size: 'compact' | 'default' | 'full') {
    setMapSize(size)
    if (size === 'compact') setMapWidthPct(50)
    if (size === 'default') setMapWidthPct(65)
    if (size === 'full')    setMapWidthPct(82)
  }

  // Geocode saved home address from emergency card for default map center
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wfa_emergency_card')
      if (raw) {
        const card = JSON.parse(raw)
        if (card.address) {
          fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(card.address)}&format=json&limit=1&countrycodes=us`,
            { headers: { 'Accept-Language': 'en' } }
          )
            .then(r => r.json())
            .then((data: { lat: string; lon: string }[]) => {
              if (data[0]) setHomeCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)])
            })
            .catch(() => {})
        }
      }
    } catch {}
  }, [])

  async function geocodeAddress(address: string, label: string) {
    if (!address.trim()) return
    setGeocoding(true)
    setGeocodeError('')
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      if (data?.[0]) {
        const loc: WatchedLocation = { label, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        setWatchedLocations(prev => {
          const filtered = prev.filter(w => w.label !== label)
          return [...filtered, loc]
        })
      } else {
        setGeocodeError('Address not found — try a more specific address.')
      }
    } catch {
      setGeocodeError('Could not reach geocoding service.')
    }
    setGeocoding(false)
  }

  function removeWatched(label: string) {
    setWatchedLocations(prev => prev.filter(w => w.label !== label))
  }

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

  // Fetch wind data when user location is known
  useEffect(() => {
    if (!userLocation) return
    const [lat, lng] = userLocation
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&timezone=auto`
    )
      .then(r => r.json())
      .then(data => {
        const speed = data?.current?.wind_speed_10m
        const dir = data?.current?.wind_direction_10m
        if (speed != null && dir != null) {
          setWindData({
            speedMph: speed,
            directionDeg: dir,
            spreadDeg: (dir + 180) % 360,
          })
        }
      })
      .catch(() => {})
  }, [userLocation])

  // Sort fires: lowest containment first (most dangerous), then by acres desc
  const sortedFires = useMemo(() => {
    return [...nifc].sort((a, b) => {
      const ca = a.containment ?? -1
      const cb = b.containment ?? -1
      if (ca !== cb) return ca - cb
      return (b.acres ?? 0) - (a.acres ?? 0)
    })
  }, [nifc])

  const center: [number, number] = userLocation ?? homeCenter ?? [37.5, -119.5]

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

      {/* Size presets + controls bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Size presets */}
        <div className="flex items-center gap-1 bg-ash-900 border border-ash-700 rounded-lg p-0.5">
          <button onClick={() => applyPreset('compact')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${mapSize === 'compact' ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-white'}`}
            title="Equal split">
            <LayoutTemplate className="w-3 h-3" /> Split
          </button>
          <button onClick={() => applyPreset('default')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${mapSize === 'default' ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-white'}`}
            title="Default layout">
            <Maximize2 className="w-3 h-3" /> Default
          </button>
          <button onClick={() => applyPreset('full')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${mapSize === 'full' ? 'bg-ash-700 text-white' : 'text-ash-400 hover:text-white'}`}
            title="Focus on map">
            <Minimize2 className="w-3 h-3" /> Map Focus
          </button>
        </div>
        <div className="w-px h-5 bg-ash-700" />
        {/* Layer controls */}
        <button onClick={locateMe} disabled={locating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50">
          <Navigation className="w-3.5 h-3.5" />
          {locating ? 'Locating…' : userLocation ? 'Update location' : 'Locate me'}
        </button>
        <button onClick={() => setShowShelters(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showShelters ? 'bg-signal-safe/20 border-signal-safe/40 text-signal-safe' : 'bg-ash-800 border-ash-700 text-ash-400 hover:text-white'}`}>
          <Heart className="w-3.5 h-3.5" />
          {showShelters ? 'Shelters: ON' : 'Shelters'}
        </button>
        <button onClick={() => setShowFacilities(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${showFacilities ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-ash-800 border-ash-700 text-ash-400 hover:text-white'}`}>
          <Factory className="w-3.5 h-3.5" />
          {showFacilities ? 'Hazard Sites: ON' : 'Hazard Sites'}
        </button>
        {locationError && <span className="text-ash-500 text-xs">Location unavailable — enable browser location.</span>}
        {userLocation && !locationError && <span className="text-blue-400 text-xs">● Distances from your location</span>}
      </div>

      {/* Person / address monitor */}
      <div className="bg-ash-800/60 border border-ash-700 rounded-xl p-3 flex flex-col gap-2 mb-3">
        <div className="text-ash-400 text-xs font-medium flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          Pin a location on the map
        </div>

        {/* Saved persons */}
        {savedPersons.filter(p => p.address).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {savedPersons.filter(p => p.address).map(p => {
              const isWatched = watchedLocations.some(w => w.label === p.name)
              return (
                <button
                  key={p.id}
                  onClick={() => isWatched ? removeWatched(p.name) : geocodeAddress(p.address, p.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    isWatched
                      ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                      : 'bg-ash-700 border-ash-600 text-ash-300 hover:text-white hover:border-ash-500'
                  }`}
                >
                  <User className="w-3 h-3" />
                  {p.name}
                  {isWatched && <X className="w-3 h-3" />}
                </button>
              )
            })}
          </div>
        )}

        {/* Manual address input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={addressInput}
            onChange={e => setAddressInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && geocodeAddress(addressInput, addressInput.split(',')[0]?.trim() || 'Location')}
            placeholder="Or type any address…"
            className="flex-1 bg-ash-900 border border-ash-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-ash-600 focus:outline-none focus:border-violet-500"
          />
          <button
            onClick={() => geocodeAddress(addressInput, addressInput.split(',')[0]?.trim() || 'Location')}
            disabled={geocoding || !addressInput.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600/20 border border-violet-500/50 text-violet-300 hover:bg-violet-600/30 transition-colors disabled:opacity-40"
          >
            <Search className="w-3.5 h-3.5" />
            {geocoding ? 'Finding…' : 'Pin'}
          </button>
        </div>
        {geocodeError && <p className="text-red-400 text-xs">{geocodeError}</p>}

        {/* Active watched pins */}
        {watchedLocations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-ash-700">
            {watchedLocations.map(w => (
              <div key={w.label} className="flex items-center gap-1 bg-violet-600/10 border border-violet-500/30 text-violet-300 text-xs px-2 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {w.label}
                <button onClick={() => removeWatched(w.label)} className="ml-0.5 hover:text-white"><X className="w-2.5 h-2.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map + fire list — resizable panels */}
      <div ref={containerRef} style={{ height: 'calc(100vh - 310px)', minHeight: 520, display: 'flex', userSelect: isDragging ? 'none' : undefined }}>
          {/* Map panel */}
          <div style={{ width: `${mapWidthPct}%`, minWidth: '30%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="h-full card overflow-hidden">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-ember-500/30 border-t-ember-500 rounded-full animate-spin" />
                <span className="text-ash-500 text-sm">Loading active fires…</span>
              </div>
            ) : (
              <LeafletMap
                nifc={sortedFires}
                userLocation={userLocation}
                center={center}
                shelters={EVAC_SHELTERS}
                showShelters={showShelters}
                watchedLocations={watchedLocations}
                facilities={HAZARD_FACILITIES}
                showFacilities={showFacilities}
                windData={windData}
              />
            )}
            </div>

          {/* Map legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ash-500 px-1 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-signal-danger" /> Active threat (&lt;25% contained)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Still spreading (25–50%)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /> Being controlled (50–75%)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-signal-safe" /> Mostly contained (75%+)</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Your location</div>
            {watchedLocations.length > 0 && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-violet-500" /> Pinned location</div>}
            {showShelters && <div className="flex items-center gap-1.5"><Heart className="w-3 h-3 text-signal-safe" /> Evacuation shelters</div>}
            {showFacilities && <>
              <div className="flex items-center gap-1.5"><span>☢</span> Nuclear facility</div>
              <div className="flex items-center gap-1.5"><span>⚗</span> Chemical plant</div>
              <div className="flex items-center gap-1.5"><span>⚡</span> LNG / Energy</div>
            </>}
            {windData && <div className="flex items-center gap-1.5"><span style={{ color: '#f97316' }}>▲</span> Fire spread direction ({Math.round(windData.speedMph)} mph wind)</div>}
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

          {/* Drag handle */}
          <div
            onMouseDown={() => setIsDragging(true)}
            style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize' }}
          >
            <div style={{ width: 2, height: 48, borderRadius: 4, background: isDragging ? '#f97316' : '#334155', transition: 'background 0.15s' }} />
          </div>

          {/* Fire cards panel */}
          <div style={{ flex: 1, minWidth: '15%', overflow: 'hidden' }}>
        <div className="flex flex-col gap-3 overflow-y-auto h-full pr-1">
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
              className="flex items-center justify-between p-3 rounded-xl border border-ash-700 hover:border-ash-500 text-ash-400 hover:text-white transition-colors text-xs shrink-0"
            >
              <span>Official evacuation guidance · Ready.gov</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
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

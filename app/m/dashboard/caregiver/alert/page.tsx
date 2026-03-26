'use client'
import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Navigation, Search, Flame, CheckCircle, Wind } from 'lucide-react'

interface FirmsPoint { lat: number; lon: number; brightness: number; confidence: number; frp: number }
type AlertLevel = 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'WATCH' | 'CLEAR'

const LEVEL_CONFIG: Record<AlertLevel, { bg: string; text: string; label: string; desc: string }> = {
  CRITICAL: { bg: 'linear-gradient(135deg, #dc2626, #991b1b)', text: 'white', label: 'CRITICAL', desc: 'Active fire very close. Leave immediately.' },
  HIGH:     { bg: 'linear-gradient(135deg, #ea580c, #c2410c)', text: 'white', label: 'HIGH',     desc: 'Fire detected nearby. Be ready to evacuate.' },
  ELEVATED: { bg: 'linear-gradient(135deg, #d97706, #b45309)', text: 'white', label: 'ELEVATED', desc: 'Fire within 25 km. Monitor alerts closely.' },
  WATCH:    { bg: 'linear-gradient(135deg, #ca8a04, #a16207)', text: 'white', label: 'WATCH',    desc: 'Conditions favorable for fire spread. Stay alert.' },
  CLEAR:    { bg: 'linear-gradient(135deg, #16a34a, #15803d)', text: 'white', label: 'CLEAR',    desc: 'No immediate fire threat detected near you.' },
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function computeLevel(nearestKm: number | null, windMph: number): AlertLevel {
  if (nearestKm === null) return 'WATCH'
  if (nearestKm < 5) return 'CRITICAL'
  if (nearestKm < 15) return 'HIGH'
  if (nearestKm < 25) return 'ELEVATED'
  if (nearestKm < 50 && windMph > 20) return 'WATCH'
  if (nearestKm < 50) return 'WATCH'
  return 'CLEAR'
}

export default function MobileFireAlertPage() {
  const [locating, setLocating] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number; label: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<{ level: AlertLevel; nearestKm: number | null; windMph: number; windDir: string; fireCount: number } | null>(null)
  const [searchVal, setSearchVal] = useState('')
  const [suggestions, setSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function locateMe() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        if (isFinite(lat) && isFinite(lon)) {
          setLocation({ lat, lon, label: 'My Location' })
          setSearchVal('My Location')
        }
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
        setSuggestions(await res.json())
      } catch {}
    }, 400)
  }

  function pickSuggestion(s: { display_name: string; lat: string; lon: string }) {
    const lat = parseFloat(s.lat)
    const lon = parseFloat(s.lon)
    if (isFinite(lat) && isFinite(lon)) setLocation({ lat, lon, label: s.display_name.split(',')[0] })
    setSearchVal(s.display_name.split(',')[0])
    setSuggestions([])
  }

  async function checkAlert() {
    if (!location) return
    setChecking(true)
    setResult(null)
    try {
      const [weatherRes, firmsRes] = await Promise.allSettled([
        fetch(`/api/weather?location=${encodeURIComponent(location.label === 'My Location' ? `${location.lat},${location.lon}` : location.label)}`),
        fetch('/api/fires/firms'),
      ])
      const weather = weatherRes.status === 'fulfilled' && weatherRes.value.ok ? await weatherRes.value.json() : null
      const firmsJson = firmsRes.status === 'fulfilled' && firmsRes.value.ok ? await firmsRes.value.json() : {}
      const points: FirmsPoint[] = Array.isArray(firmsJson?.data) ? firmsJson.data : []

      let nearestKm: number | null = null
      for (const p of points) {
        const km = haversineKm(location.lat, location.lon, p.lat, p.lon)
        if (nearestKm === null || km < nearestKm) nearestKm = km
      }
      if (nearestKm !== null && nearestKm > 200) nearestKm = null

      const windMph = weather?.wind_mph ?? 0
      const windDir = weather?.wind_dir ?? '—'
      const level = computeLevel(nearestKm, windMph)
      setResult({ level, nearestKm, windMph, windDir, fireCount: points.length })
    } catch {}
    setChecking(false)
  }

  const cfg = result ? LEVEL_CONFIG[result.level] : null

  return (
    <div className="min-h-full">
      <div className="px-4 pt-10 pb-5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-orange-700 text-xs font-semibold uppercase tracking-widest mb-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Early Fire Alert
        </div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Fire Risk Near You</h1>
        <p className="text-gray-400 text-sm mt-1">Check fire threat before official orders are issued.</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Location input */}
        <div className="space-y-2">
          <div className="relative">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchVal}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Enter your address…"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0" onMouseDown={() => pickSuggestion(s)}>
                      <div className="font-medium truncate">{s.display_name.split(',')[0]}</div>
                      <div className="text-xs text-gray-400 truncate">{s.display_name.split(',').slice(1, 3).join(',')}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={locateMe}
            disabled={locating}
            className="flex items-center gap-2 text-sm font-semibold text-green-700 disabled:opacity-50"
          >
            <Navigation className="w-3.5 h-3.5" />
            {locating ? 'Getting location…' : 'Use my current location'}
          </button>
        </div>

        <button
          onClick={checkAlert}
          disabled={!location || checking}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
        >
          {checking ? 'Checking…' : 'Check Fire Alert'}
        </button>

        {/* Result */}
        {result && cfg && (
          <div className="rounded-2xl overflow-hidden">
            <div className="px-5 py-5" style={{ background: cfg.bg }}>
              <div className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Alert Level</div>
              <div className="text-white font-bold text-3xl mb-1">{cfg.label}</div>
              <div className="text-white/80 text-sm">{cfg.desc}</div>
            </div>
            <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl divide-y divide-gray-100">
              <div className="flex items-center gap-3 px-5 py-3">
                <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {result.nearestKm !== null ? `Nearest fire: ${result.nearestKm.toFixed(1)} km away` : 'No nearby fire hotspots detected'}
                  </div>
                  <div className="text-xs text-gray-400">{result.fireCount} satellite hotspots checked</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3">
                <Wind className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="text-sm font-medium text-gray-900">
                  Wind {result.windMph} mph {result.windDir}
                </div>
              </div>
              {result.level !== 'CLEAR' && (
                <div className="flex items-start gap-3 px-5 py-3 bg-amber-50">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">This is an early estimate only. Always follow official evacuation orders from local authorities. Call 911 in emergencies.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

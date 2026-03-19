'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface NifcFire {
  id: string
  latitude: number
  longitude: number
  fire_name: string
  acres: number | null
  containment: number | null
  source: 'nifc_perimeter' | 'nifc_incident'
}

function containmentColor(pct: number | null) {
  if (pct == null || pct < 25) return '#ef4444'
  if (pct < 50) return '#f97316'
  if (pct < 75) return '#eab308'
  return '#22c55e'
}

function containmentRadius(acres: number | null) {
  if (!acres) return 9
  return Math.min(8 + Math.log10(acres + 1) * 4, 22)
}

function shelterIcon(type: 'evacuation' | 'animal') {
  const color = type === 'evacuation' ? '#22c55e' : '#3b82f6'
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26">
    <circle cx="12" cy="12" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <path d="M12 17.5s-5-3.5-5-7a3 3 0 0 1 5-2.24A3 3 0 0 1 17 10.5c0 3.5-5 7-5 7z" fill="${color}" stroke="${color}" stroke-width="0.5" stroke-linejoin="round"/>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="26" height="26" style="display:block" />`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
    className: '',
  })
}

function FlyToUser({ coords }: { coords: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo(coords, 8, { duration: 1.2 })
  }, [coords, map])
  return null
}

export interface EvacShelter {
  id: number
  name: string
  lat: number
  lng: number
  type: 'evacuation' | 'animal'
  county: string
  capacity: number
}

export interface WatchedLocation {
  label: string
  lat: number
  lng: number
}

function watchedIcon() {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
    <ellipse cx="16" cy="38" rx="6" ry="2.5" fill="#7c3aed" fill-opacity="0.25"/>
    <path d="M16 2C10.477 2 6 6.477 6 12c0 7.5 10 24 10 24s10-16.5 10-24C26 6.477 21.523 2 16 2z" fill="#7c3aed" stroke="#5b21b6" stroke-width="1.5"/>
    <circle cx="16" cy="12" r="4.5" fill="white" fill-opacity="0.9"/>
    <circle cx="16" cy="12" r="2.5" fill="#7c3aed"/>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="32" height="40" style="display:block" />`,
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38],
    className: '',
  })
}

interface Props {
  nifc: NifcFire[]
  userLocation: [number, number] | null
  center: [number, number]
  shelters?: EvacShelter[]
  showShelters?: boolean
  watchedLocations?: WatchedLocation[]
}

export default function LeafletMap({ nifc, userLocation, center, shelters = [], showShelters = false, watchedLocations = [] }: Props) {
  // Filter out fully contained fires (100%)
  const activeFires = nifc.filter(f => f.containment == null || f.containment < 100)

  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToUser coords={userLocation} />

      {/* User location pin */}
      {userLocation && (
        <CircleMarker
          center={userLocation}
          radius={8}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 12 }}>
              <strong>Your location</strong>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Watched person pins — purple teardrop */}
      {watchedLocations.map((w, i) => (
        <Marker key={`watched-${i}`} position={[w.lat, w.lng]} icon={watchedIcon()}>
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
              <strong style={{ color: '#7c3aed' }}>{w.label}</strong>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Evacuation shelters — heart icon */}
      {showShelters && shelters.map(s => (
        <Marker
          key={`shelter-${s.id}`}
          position={[s.lat, s.lng]}
          icon={shelterIcon(s.type)}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
              <strong>{s.name}</strong><br />
              {s.type === 'evacuation' ? '🏠 Evacuation Shelter' : '🐾 Animal Shelter'}<br />
              {s.county}<br />
              Capacity: {s.capacity.toLocaleString()}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* NIFC active fires — skip 100% contained */}
      {activeFires.map((f) => {
        const color = containmentColor(f.containment)
        const radius = containmentRadius(f.acres)
        const pct = f.containment
        return (
          <CircleMarker
            key={f.id}
            center={[f.latitude, f.longitude]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
                <strong>{f.fire_name}</strong><br />
                {f.acres != null
                  ? <>{f.acres.toLocaleString(undefined, { maximumFractionDigits: 0 })} acres · </>
                  : null}
                {pct != null ? `${pct}% contained` : 'containment unknown'}<br />
                <span style={{ color, fontWeight: 600 }}>
                  {pct == null || pct < 25
                    ? '⚠ Active threat — monitor alerts'
                    : pct < 50
                    ? '⚠ Still spreading — stay ready'
                    : pct < 75
                    ? '↗ Being controlled'
                    : '✓ Mostly contained'}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

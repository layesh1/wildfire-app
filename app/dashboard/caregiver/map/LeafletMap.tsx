'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
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

interface Props {
  nifc: NifcFire[]
  userLocation: [number, number] | null
  center: [number, number]
  shelters?: EvacShelter[]
  showShelters?: boolean
}

export default function LeafletMap({ nifc, userLocation, center, shelters = [], showShelters = false }: Props) {
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

      {/* Evacuation shelters */}
      {showShelters && shelters.map(s => (
        <CircleMarker
          key={`shelter-${s.id}`}
          center={[s.lat, s.lng]}
          radius={7}
          pathOptions={{
            color: s.type === 'evacuation' ? '#22c55e' : '#3b82f6',
            fillColor: s.type === 'evacuation' ? '#22c55e' : '#3b82f6',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
              <strong>{s.name}</strong><br />
              {s.type === 'evacuation' ? '🏠 Evacuation Shelter' : '🐾 Animal Shelter'}<br />
              {s.county}<br />
              Capacity: {s.capacity.toLocaleString()}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* NIFC active fires — colored by containment */}
      {nifc.map((f) => {
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
                <span style={{
                  color,
                  fontWeight: 600,
                }}>
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

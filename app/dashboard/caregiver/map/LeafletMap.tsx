'use client'
import { useEffect, useState } from 'react'
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

export interface EvacShelter {
  id: number
  name: string
  lat: number
  lng: number
  type: 'evacuation' | 'animal'
  county: string
  capacity: number
}

export interface HazardSite {
  id: number
  name: string
  lat: number
  lng: number
  type: 'nuclear' | 'superfund' | 'chemical'
  state: string
}

export type TileLayerType = 'street' | 'satellite' | 'topo'

const TILE_LAYERS: Record<TileLayerType, { url: string; attribution: string; label: string }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: 'Street',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    label: 'Satellite',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    label: 'Topo',
  },
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

function hazardIcon(type: HazardSite['type']) {
  const color = type === 'nuclear' ? '#a855f7' : type === 'chemical' ? '#f59e0b' : '#6366f1'
  const emoji = type === 'nuclear' ? '☢' : type === 'chemical' ? '⚗' : '⚠'
  return L.divIcon({
    html: `<div style="width:24px;height:24px;background:${color}22;border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
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

function TileLayerSwitcher({ active, onChange }: { active: TileLayerType; onChange: (t: TileLayerType) => void }) {
  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 4 }}>
      {(Object.keys(TILE_LAYERS) as TileLayerType[]).map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid',
            cursor: 'pointer',
            background: active === t ? '#1e293b' : 'rgba(255,255,255,0.92)',
            color: active === t ? '#fff' : '#334155',
            borderColor: active === t ? '#475569' : '#cbd5e1',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          {TILE_LAYERS[t].label}
        </button>
      ))}
    </div>
  )
}

function MapLegend({ showShelters, showHazards }: { showShelters: boolean; showHazards: boolean }) {
  return (
    <div style={{
      position: 'absolute', bottom: 24, left: 10, zIndex: 1000,
      background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
      padding: '8px 12px', color: '#cbd5e1', fontSize: 11, lineHeight: '1.8',
      maxWidth: 220,
    }}>
      <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
        Active threat (&lt;25% contained)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
        Still spreading (25–50%)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', flexShrink: 0 }} />
        Being controlled (50–75%)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
        Mostly contained (75%+)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
        Your location
      </div>
      {showShelters && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e44', border: '2px solid #22c55e', flexShrink: 0 }} />
            Evacuation shelter
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f644', border: '2px solid #3b82f6', flexShrink: 0 }} />
            Animal shelter
          </div>
        </>
      )}
      {showHazards && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#a855f744', border: '2px solid #a855f7', flexShrink: 0, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☢</div>
            Nuclear plant
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b44', border: '2px solid #f59e0b', flexShrink: 0, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚠</div>
            Superfund/Hazmat site
          </div>
        </>
      )}
    </div>
  )
}

// Inner map component that has access to useMap
function MapInner({
  nifc, userLocation, shelters, showShelters, hazards, showHazards,
}: {
  nifc: NifcFire[]
  userLocation: [number, number] | null
  shelters: EvacShelter[]
  showShelters: boolean
  hazards: HazardSite[]
  showHazards: boolean
}) {
  const [tileLayer, setTileLayer] = useState<TileLayerType>('street')
  const activeFires = nifc.filter(f => f.containment == null || f.containment < 100)
  const tl = TILE_LAYERS[tileLayer]

  return (
    <>
      <TileLayer attribution={tl.attribution} url={tl.url} />
      <FlyToUser coords={userLocation} />

      {/* Tile layer switcher overlay */}
      <TileLayerSwitcher active={tileLayer} onChange={setTileLayer} />

      {/* Legend overlay */}
      <MapLegend showShelters={showShelters} showHazards={showHazards} />

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
        <Marker key={`shelter-${s.id}`} position={[s.lat, s.lng]} icon={shelterIcon(s.type)}>
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

      {/* Hazard/nuclear sites */}
      {showHazards && hazards.map(h => (
        <Marker key={`hazard-${h.id}`} position={[h.lat, h.lng]} icon={hazardIcon(h.type)}>
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
              <strong>{h.name}</strong><br />
              {h.type === 'nuclear' ? '☢ Nuclear Power Plant' : h.type === 'chemical' ? '⚗ Chemical Facility' : '⚠ Superfund Site'}<br />
              {h.state}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* NIFC active fires */}
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
    </>
  )
}

interface Props {
  nifc: NifcFire[]
  userLocation: [number, number] | null
  center: [number, number]
  shelters?: EvacShelter[]
  showShelters?: boolean
  hazards?: HazardSite[]
  showHazards?: boolean
}

export default function LeafletMap({
  nifc, userLocation, center,
  shelters = [], showShelters = false,
  hazards = [], showHazards = false,
}: Props) {
  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
      <MapInner
        nifc={nifc}
        userLocation={userLocation}
        shelters={shelters}
        showShelters={showShelters}
        hazards={hazards}
        showHazards={showHazards}
      />
    </MapContainer>
  )
}

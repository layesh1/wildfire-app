'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { HazardFacility, FacilityType } from '@/lib/hazard-facilities'

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

export interface WindData {
  speedMph: number
  directionDeg: number   // meteorological: direction wind comes FROM
  spreadDeg: number      // (directionDeg + 180) % 360 — fire spreads this way
}

export interface WatchedLocation {
  label: string
  lat: number
  lng: number
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

export function hazardIcon(type: FacilityType) {
  const configs: Record<FacilityType, { bg: string; border: string; emoji: string }> = {
    nuclear:    { bg: '#fef3c7', border: '#f59e0b', emoji: '☢' },
    chemical:   { bg: '#fee2e2', border: '#ef4444', emoji: '⚗' },
    lng_energy: { bg: '#dbeafe', border: '#3b82f6', emoji: '⚡' },
  }
  const { bg, border, emoji } = configs[type]
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30">
    <circle cx="15" cy="15" r="14" fill="${bg}" stroke="${border}" stroke-width="2"/>
    <text x="15" y="20" text-anchor="middle" font-size="14">${emoji}</text>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="30" height="30" style="display:block" />`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: '',
  })
}

function windArrowIcon(spreadDeg: number) {
  // Arrow points in the fire spread direction (downwind)
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <g transform="rotate(${spreadDeg}, 18, 18)">
      <polygon points="18,4 24,22 18,18 12,22" fill="#f97316" stroke="#ea580c" stroke-width="1" stroke-linejoin="round"/>
    </g>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="36" height="36" style="display:block" />`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    className: '',
  })
}

function WindCompass({ wind }: { wind: WindData }) {
  const needleRot = wind.directionDeg  // needle points where wind comes FROM
  return (
    <div style={{
      position: 'absolute',
      bottom: 28,
      left: 10,
      zIndex: 1000,
      pointerEvents: 'none',
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '6px 10px 6px 8px',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
      fontSize: 12,
      color: '#374151',
    }}>
      <svg width="36" height="36" viewBox="0 0 36 36">
        {/* Compass ring */}
        <circle cx="18" cy="18" r="16" fill="none" stroke="#d1d5db" strokeWidth="1.5"/>
        <text x="18" y="7" textAnchor="middle" fontSize="6" fill="#6b7280">N</text>
        <text x="18" y="33" textAnchor="middle" fontSize="6" fill="#6b7280">S</text>
        <text x="7" y="21" textAnchor="middle" fontSize="6" fill="#6b7280">W</text>
        <text x="30" y="21" textAnchor="middle" fontSize="6" fill="#6b7280">E</text>
        {/* Wind needle — points to source direction */}
        <g transform={`rotate(${needleRot}, 18, 18)`}>
          <polygon points="18,5 20,18 18,22 16,18" fill="#3b82f6" opacity="0.9"/>
          <polygon points="18,22 20,18 18,31 16,18" fill="#9ca3af" opacity="0.7"/>
        </g>
      </svg>
      <div>
        <div style={{ fontWeight: 600, color: '#f97316' }}>
          Wind {Math.round(wind.speedMph)} mph
        </div>
        <div style={{ color: '#6b7280', fontSize: 11 }}>
          Fire spreads {spreadLabel(wind.spreadDeg)}
        </div>
      </div>
    </div>
  )
}

function spreadLabel(deg: number) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
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

function FlyToUser({ coords }: { coords: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords && isFinite(coords[0]) && isFinite(coords[1])) map.flyTo(coords, 8, { duration: 1.2 })
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

function MapLegend({ showShelters, showFacilities }: { showShelters: boolean; showFacilities: boolean }) {
  return (
    <div style={{
      position: 'absolute', bottom: 24, right: 10, zIndex: 1000,
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
      {showFacilities && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>☢</span>
            Nuclear facility
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>⚗</span>
            Chemical plant
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>⚡</span>
            LNG / Energy
          </div>
        </>
      )}
    </div>
  )
}

const FACILITY_LABELS: Record<FacilityType, string> = {
  nuclear: 'Nuclear Facility',
  chemical: 'Chemical / Petrochemical',
  lng_energy: 'LNG / Energy',
}

interface Props {
  nifc: NifcFire[]
  userLocation: [number, number] | null
  center: [number, number]
  shelters?: EvacShelter[]
  showShelters?: boolean
  watchedLocations?: WatchedLocation[]
  facilities?: HazardFacility[]
  showFacilities?: boolean
  windData?: WindData | null
}

export default function LeafletMap({
  nifc,
  userLocation,
  center,
  shelters = [],
  showShelters = false,
  watchedLocations = [],
  facilities = [],
  showFacilities = false,
  windData = null,
}: Props) {
  const [tileLayer, setTileLayer] = useState<TileLayerType>('street')

  // Filter out fully contained fires (100%)
  const activeFires = nifc.filter(f => f.containment == null || f.containment < 100)
  const tl = TILE_LAYERS[tileLayer]

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution={tl.attribution} url={tl.url} />
        <FlyToUser coords={userLocation} />

        {/* Tile layer switcher overlay */}
        <TileLayerSwitcher active={tileLayer} onChange={setTileLayer} />

        {/* Legend overlay */}
        <MapLegend showShelters={showShelters} showFacilities={showFacilities} />

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

        {/* Hazardous facilities */}
        {showFacilities && facilities.map(f => (
          <Marker
            key={`hazard-${f.id}`}
            position={[f.lat, f.lng]}
            icon={hazardIcon(f.type)}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7, maxWidth: 240 }}>
                <strong>{f.name}</strong><br />
                <span style={{ fontSize: 11, color: '#6b7280' }}>{FACILITY_LABELS[f.type]} · {f.county}, {f.state}</span><br />
                <span style={{ fontSize: 12, color: '#374151' }}>{f.riskNote}</span>
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

        {/* Wind spread arrows — one per active fire */}
        {windData && activeFires.map((f) => (
          <Marker
            key={`wind-${f.id}`}
            position={[f.latitude, f.longitude]}
            icon={windArrowIcon(windData.spreadDeg)}
            interactive={false}
          />
        ))}
      </MapContainer>

      {/* Wind compass overlay */}
      {windData && <WindCompass wind={windData} />}
    </div>
  )
}

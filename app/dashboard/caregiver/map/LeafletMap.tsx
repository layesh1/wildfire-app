'use client'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { HazardFacility, FacilityType } from '@/lib/hazard-facilities'
import LeafletInvalidateOnLayout from '@/components/leaflet/LeafletInvalidateOnLayout'
import NifcFireMapFeatures from '@/components/leaflet/NifcFireMapFeatures'
import WindCompassOverlay from '@/components/leaflet/WindCompassOverlay'

export interface NifcFire {
  id: string
  latitude: number
  longitude: number
  fire_name: string
  acres: number | null
  containment: number | null
  source: 'nifc_perimeter' | 'nifc_incident'
  /** Perimeter rings from NIFC (each ring is [lat, lng][]; first ring outer, rest holes). */
  perimeter_rings?: [number, number][][]
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

/** FEMA NSS open shelters for map (from GET /api/shelters/live). */
export interface LiveShelterPin {
  id: string
  name: string
  lat: number
  lng: number
  capacity?: number | null
  currentOccupancy?: number | null
  lastVerifiedAt?: string | null
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

function shelterIcon(type: 'evacuation' | 'animal') {
  const ring = type === 'evacuation' ? '#22c55e' : '#3b82f6'
  const fill = type === 'evacuation' ? '#15803d' : '#2563eb'
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26">
    <circle cx="12" cy="12" r="11" fill="${ring}" fill-opacity="0.22" stroke="${ring}" stroke-width="1.5"/>
    <path d="M12 4.5L4.5 10.5V19h3v-6h9v6h3v-8.5L12 4.5z" fill="${fill}" stroke="${fill}" stroke-width="0.35" stroke-linejoin="round"/>
    <path d="M9 19v-5h6v5" fill="none" stroke="${fill}" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="26" height="26" style="display:block" />`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
    className: '',
  })
}

/** FEMA-verified open shelter — green circle + check */
function verifiedFemaShelterIcon() {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
    <circle cx="14" cy="14" r="12" fill="#22c55e" fill-opacity="0.25" stroke="#16a34a" stroke-width="2"/>
    <path d="M8 14.5l4 4 8-9" fill="none" stroke="#15803d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="28" height="28" style="display:block" alt="" />`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
    className: '',
  })
}

/** Pre-identified site — not confirmed open */
function preIdentifiedShelterIcon() {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
    <circle cx="14" cy="14" r="12" fill="#64748b" fill-opacity="0.35" stroke="#475569" stroke-width="2"/>
    <text x="14" y="18" text-anchor="middle" font-size="12" fill="#1e293b">&#x1F4CD;</text>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="28" height="28" style="display:block" alt="" />`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
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

function FlyToUser({
  coords,
  zoom,
  trigger = 0,
  suppressInitialFly,
}: {
  coords: [number, number] | null
  zoom: number
  trigger?: number
  /** When true, skip flying on first mount; fly only after `trigger` increments (e.g. Locate me). */
  suppressInitialFly?: boolean
}) {
  const map = useMap()
  useEffect(() => {
    if (!coords || !isFinite(coords[0]) || !isFinite(coords[1])) return
    if (suppressInitialFly && trigger === 0) return
    map.flyTo(coords, zoom, { duration: 1.2 })
  }, [coords, map, zoom, trigger, suppressInitialFly])
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

function MapLegend({
  showShelters,
  showFacilities,
  showHomePin,
}: {
  showShelters: boolean
  showFacilities: boolean
  showHomePin: boolean
}) {
  return (
    <div style={{
      position: 'absolute', bottom: 24, right: 10, zIndex: 1000,
      background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
      padding: '8px 12px', color: '#cbd5e1', fontSize: 13, lineHeight: '1.8',
      maxWidth: 220,
    }}>
      <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
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
      {showHomePin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#a855f7', flexShrink: 0 }} />
          Home (saved address)
        </div>
      )}
      {showShelters && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden>
              <svg width="22" height="22" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="11" fill="#22c55e" fillOpacity={0.25} stroke="#16a34a" strokeWidth="2" />
                <path d="M8 14.5l4 4 8-9" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>Open shelter (FEMA feed)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden>
              <svg width="22" height="22" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="11" fill="#64748b" fillOpacity={0.35} stroke="#475569" strokeWidth="2" />
                <text x="14" y="18" textAnchor="middle" fontSize="11" fill="#e2e8f0">&#x1F4CD;</text>
              </svg>
            </span>
            <span>Pre-identified (unconfirmed)</span>
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
  /** Zoom level when flying to GPS after location is granted (default 7 — regional / state-scale). */
  flyToUserZoom?: number
  /** Geocoded home from profile — shown when you’re away from home. */
  homePosition?: [number, number] | null
  showHomePin?: boolean
  shelters?: EvacShelter[]
  /** Live FEMA NSS open shelters — rendered as verified green pins */
  liveShelters?: LiveShelterPin[]
  showShelters?: boolean
  watchedLocations?: WatchedLocation[]
  facilities?: HazardFacility[]
  showFacilities?: boolean
  windData?: WindData | null
  /** Bump to re-run fly-to even when GPS coords are unchanged (Locate me). */
  flyToTrigger?: number
  /** Avoid auto panning to GPS on load (field hub keeps Concord/demo framing until Locate me). */
  suppressInitialFlyToUser?: boolean
}

export default function LeafletMap({
  nifc,
  userLocation,
  center,
  flyToUserZoom = 7,
  homePosition = null,
  showHomePin = false,
  shelters = [],
  liveShelters = [],
  showShelters = false,
  watchedLocations = [],
  facilities = [],
  showFacilities = false,
  windData = null,
  flyToTrigger = 0,
  suppressInitialFlyToUser = false,
}: Props) {
  const [tileLayer, setTileLayer] = useState<TileLayerType>('street')
  /** Unique per component instance so React never reuses a Leaflet container incorrectly. */
  const mapInstanceKey = useMemo(
    () =>
      typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID
        ? globalThis.crypto.randomUUID()
        : `leaflet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    []
  )
  /** Mount map only after client hydration. */
  const [mapReady, setMapReady] = useState(false)
  useEffect(() => {
    setMapReady(true)
  }, [])

  const tl = TILE_LAYERS[tileLayer]
  // Guard against NaN/Infinity coords — Leaflet crashes hard if center is invalid
  const safeCenter: [number, number] = (isFinite(center[0]) && isFinite(center[1])) ? center : [37.5, -119.5]

  if (!mapReady) {
    return (
      <div className="h-full w-full min-h-[200px] animate-pulse rounded-lg bg-gray-100" aria-hidden />
    )
  }

  return (
    <div className="relative h-full min-h-[220px] w-full min-w-0 sm:min-h-[280px]">
      <MapContainer
        key={mapInstanceKey}
        center={safeCenter}
        zoom={6}
        className="z-0 h-full w-full min-h-[inherit]"
        style={{ height: '100%', width: '100%', minHeight: 'inherit' }}
        scrollWheelZoom
      >
        <TileLayer attribution={tl.attribution} url={tl.url} />
        <LeafletInvalidateOnLayout />
        <FlyToUser
          coords={userLocation}
          zoom={flyToUserZoom}
          trigger={flyToTrigger}
          suppressInitialFly={suppressInitialFlyToUser}
        />

        {/* Home address pin when you’re away from saved home */}
        {showHomePin && homePosition && isFinite(homePosition[0]) && isFinite(homePosition[1]) && (
          <CircleMarker
            center={homePosition}
            radius={7}
            pathOptions={{ color: '#a855f7', fillColor: '#a855f7', fillOpacity: 0.95, weight: 2 }}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 12 }}>
                <strong>Home</strong>
                <div style={{ color: '#6b7280', marginTop: 4 }}>Saved address</div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {showShelters && liveShelters.map(s => (
          <Marker key={`live-shelter-${s.id}`} position={[s.lat, s.lng]} icon={verifiedFemaShelterIcon()}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
                <strong>{s.name}</strong><br />
                OPEN — verified (FEMA NSS)<br />
                {s.capacity != null && s.capacity > 0 && (
                  <>
                    Capacity: {s.capacity.toLocaleString()}
                    {s.currentOccupancy != null && s.currentOccupancy >= 0
                      ? ` · ${s.currentOccupancy.toLocaleString()} reported`
                      : ''}
                    <br />
                  </>
                )}
                <span style={{ fontSize: 11, color: '#64748b' }}>Confirm before traveling.</span>
              </div>
            </Popup>
          </Marker>
        ))}
        {/* Pre-identified human sites only — not confirmed open */}
        {showShelters && shelters.filter(s => s.type === 'evacuation').map(s => (
          <Marker key={`shelter-${s.id}`} position={[s.lat, s.lng]} icon={preIdentifiedShelterIcon()}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
                <strong>{s.name}</strong><br />
                📍 Pre-identified — status unconfirmed<br />
                {s.county}<br />
                Typical capacity (estimate): {s.capacity.toLocaleString()}
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Tap for details — call ahead before traveling.</div>
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

        <NifcFireMapFeatures nifc={nifc} />

        {/* Watched person pins — above fire polygons so circles stay visible */}
        {watchedLocations.map((w, i) => (
          <Marker key={`watched-${i}`} position={[w.lat, w.lng]} icon={watchedIcon()}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
                <strong style={{ color: '#7c3aed' }}>{w.label}</strong>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User location pin (last) */}
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
      </MapContainer>

      {/* UI overlays live outside MapContainer (react-leaflet layer tree); same absolute positioning as before */}
      <TileLayerSwitcher active={tileLayer} onChange={setTileLayer} />
      <MapLegend showShelters={showShelters} showFacilities={showFacilities} showHomePin={showHomePin} />

      {/* Wind compass overlay */}
      {windData && <WindCompassOverlay wind={windData} />}
    </div>
  )
}

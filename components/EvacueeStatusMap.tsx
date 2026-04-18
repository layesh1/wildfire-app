'use client'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import type { HazardFacility, FacilityType } from '@/lib/hazard-facilities'
import LeafletInvalidateOnLayout from '@/components/leaflet/LeafletInvalidateOnLayout'
import {
  resolvePinHomeEvacuationStatus,
  labelForHomeEvacuationStatus,
  isHomeEvacuationStatus,
  type HomeEvacuationStatus,
} from '@/lib/checkin-status'
import type { HouseholdPin } from '@/lib/responder-household'
import type {
  EvacShelter,
  LiveShelterPin,
  NifcFire,
  WindData,
} from '@/app/dashboard/caregiver/map/LeafletMap'
import type { FirefighterPin } from '@/lib/firefighter-pin'
import { distanceMiles } from '@/lib/hub-map-distance'
import NifcFireMapFeatures from '@/components/leaflet/NifcFireMapFeatures'
import NifcFirePredictionOverlay from '@/components/leaflet/NifcFirePredictionOverlay'
import WindCompassOverlay from '@/components/leaflet/WindCompassOverlay'
import HouseholdPinMapFeatures from '@/components/leaflet/HouseholdPinMapFeatures'
import { fireStationMarkerImgHtml, getFireStationMapIcon } from '@/components/leaflet/fireStationMapIcon'
import { responderEvacueeMarkerHtmlTint } from '@/components/leaflet/responderEvacueeMarkerIcon'

export interface EvacueePin {
  id: string
  name: string
  address: string
  lat: number
  lon: number
  status: 'evacuated' | 'sheltering' | 'returning' | 'unknown'
  phone?: string
  special_needs?: string
  /** When set (e.g. demo or synced profile), overrides legacy `status` for home evacuation coloring. */
  home_evacuation_status?: HomeEvacuationStatus
  /** Short tags from onboarding / profile (responder map). */
  mobility_needs?: string[]
  medical_needs?: string[]
  disability_other?: string
  medical_other?: string
  /** Demo / synthetic pins from DEMO_PINS fallback. */
  is_demo?: boolean
}

const OXY_DIALYSIS = new Set([
  'Requires oxygen or ventilator',
  'Requires dialysis',
])

function truncate(s: string | undefined, max: number) {
  if (!s) return ''
  const t = s.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

function pinShowsLifeEquipment(pin: EvacueePin): boolean {
  const m = pin.medical_needs
  if (!m?.length) return false
  return m.some(x => OXY_DIALYSIS.has(x))
}

function pinHomeEvacuationStatus(pin: EvacueePin): HomeEvacuationStatus {
  return resolvePinHomeEvacuationStatus(pin)
}

const HOME_STATUS_COLOR: Record<HomeEvacuationStatus, string> = {
  not_evacuated: '#6b7280',
  evacuated: '#22c55e',
  cannot_evacuate: '#ef4444',
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

function hazardIcon(type: FacilityType) {
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

const FACILITY_LABELS: Record<FacilityType, string> = {
  nuclear: 'Nuclear Facility',
  chemical: 'Chemical / Petrochemical',
  lng_energy: 'LNG / Energy',
}

function MapFlyTo({ target }: { target: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target || !Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return
    // setTimeout ensures flyTo runs after any fitBounds effects triggered in the same render cycle
    const id = setTimeout(() => {
      map.flyTo([target.lat, target.lng], 16, { duration: 0.9 })
    }, 50)
    return () => clearTimeout(id)
  }, [map, target?.lat, target?.lng, target?.nonce])
  return null
}

const firefighterHelmetIcon = (() => {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" width="34" height="34">
    <circle cx="17" cy="17" r="15" fill="#2563eb" fill-opacity="0.92" stroke="#1e40af" stroke-width="2"/>
    <circle cx="17" cy="17" r="6" fill="#93c5fd" fill-opacity="0.95"/>
  </svg>`)
  return L.divIcon({
    html: `<img src="data:image/svg+xml,${svg}" width="34" height="34" style="display:block" alt="" />`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    className: '',
  })
})()

function ffSeenLabel(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (!Number.isFinite(m) || m < 0) return 'Unknown'
  if (m === 0) return 'Just now'
  if (m === 1) return '1 min ago'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h === 1 ? '1 hr ago' : `${h} hr ago`
}

function FitBoundsCombined({
  pins,
  householdPins,
  stationAnchor,
  firefighters = [],
  nifcFires = [],
  /** Command hub: include NIFC dots in bounds + regional framing. */
  commandHubFraming = false,
  /** Command hub: only points within this many miles of the anchor participate in fitBounds (avoids US-wide zoom). */
  commandHubFitRadiusMiles = null,
  /** When station pin is hidden, use map center as the hub anchor for radius filtering. */
  mapCenterFallback = null,
}: {
  pins: EvacueePin[]
  householdPins: HouseholdPin[]
  stationAnchor?: { lat: number; lng: number } | null
  firefighters?: FirefighterPin[]
  nifcFires?: NifcFire[]
  commandHubFraming?: boolean
  commandHubFitRadiusMiles?: number | null
  mapCenterFallback?: [number, number] | null
}) {
  const map = useMap()
  useEffect(() => {
    let pts: [number, number][] = [
      ...pins.map(p => [p.lat, p.lon] as [number, number]),
      ...householdPins.flatMap(h => {
        const home: [number, number] = [h.lat, h.lng]
        const offices = (h.officeSites ?? []).map(o => [o.lat, o.lng] as [number, number])
        return [home, ...offices]
      }),
      ...firefighters
        .filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng))
        .map(f => [f.lat, f.lng] as [number, number]),
      ...nifcFires
        .filter(f => Number.isFinite(f.latitude) && Number.isFinite(f.longitude))
        .map(f => [f.latitude, f.longitude] as [number, number]),
    ]
    if (
      stationAnchor != null
      && Number.isFinite(stationAnchor.lat)
      && Number.isFinite(stationAnchor.lng)
    ) {
      pts.push([stationAnchor.lat, stationAnchor.lng])
    }

    const hubAnchor: [number, number] | null =
      stationAnchor != null && Number.isFinite(stationAnchor.lat) && Number.isFinite(stationAnchor.lng)
        ? [stationAnchor.lat, stationAnchor.lng]
        : mapCenterFallback != null
          && Number.isFinite(mapCenterFallback[0])
          && Number.isFinite(mapCenterFallback[1])
          ? [mapCenterFallback[0], mapCenterFallback[1]]
          : null

    const hubR =
      commandHubFraming && commandHubFitRadiusMiles != null && Number.isFinite(commandHubFitRadiusMiles)
        ? Math.max(20, commandHubFitRadiusMiles)
        : null

    if (hubR != null && hubAnchor != null) {
      pts = pts.filter(([lat, lon]) => distanceMiles([lat, lon], hubAnchor) <= hubR)
    }

    if (pts.length === 0) {
      if (hubAnchor != null) {
        map.setView(hubAnchor, commandHubFraming ? 11 : 12)
      }
      return
    }

    if (pts.length === 1) {
      map.setView(pts[0], commandHubFraming ? 11 : 12)
      return
    }

    const lats = pts.map(p => p[0])
    const lons = pts.map(p => p[1])
    const pad = commandHubFraming ? 0.028 : 0.01
    map.fitBounds(
      [
        [Math.min(...lats) - pad, Math.min(...lons) - pad],
        [Math.max(...lats) + pad, Math.max(...lons) + pad],
      ],
      {
        maxZoom: commandHubFraming ? 14 : 14,
        padding: commandHubFraming ? [20, 20] : [12, 12],
      }
    )
  }, [
    pins,
    householdPins,
    stationAnchor,
    firefighters,
    nifcFires,
    commandHubFraming,
    commandHubFitRadiusMiles,
    mapCenterFallback,
    map,
  ])
  return null
}

function mapStats(pins: EvacueePin[], householdPins: HouseholdPin[]) {
  let notEvacuated = pins.filter(p => pinHomeEvacuationStatus(p) === 'not_evacuated').length
  let evacuated = pins.filter(p => pinHomeEvacuationStatus(p) === 'evacuated').length
  let cannotEvac = pins.filter(p => pinHomeEvacuationStatus(p) === 'cannot_evacuate').length
  for (const h of householdPins) {
    notEvacuated += h.not_evacuated
    evacuated += h.evacuated
    cannotEvac += h.needs_help
  }
  return { notEvacuated, evacuated, cannotEvac }
}

interface Props {
  pins: EvacueePin[]
  householdPins?: HouseholdPin[]
  center?: [number, number]
  zoom?: number
  facilities?: HazardFacility[]
  showFacilities?: boolean
  /** When true, show a small banner (demo-only or fallback mode). */
  demoMode?: boolean
  onResponderStatusUpdated?: () => void
  /** Fly map to coordinates when `nonce` changes (e.g. COMMAND “View on Map”). */
  mapFocusRequest?: { lat: number; lng: number; nonce: number } | null
  /** Same NIFC feed as household hub Leaflet map (perimeters + point incidents). */
  nifcFires?: NifcFire[]
  /** When true, draw fires as circle markers only (e.g. legacy minimal view). */
  nifcFiresCircleOnly?: boolean
  /** Dashed modeled-risk halos (+ wind ellipse when wind data exists). Command hub default on. */
  showNifcPredictionOverlays?: boolean
  windData?: WindData | null
  shelters?: EvacShelter[]
  liveShelters?: LiveShelterPin[]
  showShelters?: boolean
  /** Map icon for fire station / command anchor (hub center). */
  stationAnchor?: { lat: number; lng: number; label?: string | null } | null
  /** With {@link householdTintNifcFires}, grey house pins when no active incident is within this radius (miles). */
  householdFireTintProximityMiles?: number
  householdTintNifcFires?: NifcFire[]
  /** Field units on the same station (blue pins). */
  firefighters?: FirefighterPin[]
  /**
   * When true, the map uses only the parent’s height (min-h-0) so flex layouts can cap total height.
   * Default keeps legacy min-heights for standalone pages.
   */
  fillParentHeight?: boolean
}

export default function EvacueeStatusMap({
  pins,
  householdPins = [],
  center = [35.21, -80.84],
  zoom = 12,
  facilities = [],
  showFacilities = false,
  demoMode = false,
  onResponderStatusUpdated,
  mapFocusRequest = null,
  nifcFires = [],
  nifcFiresCircleOnly = false,
  showNifcPredictionOverlays = false,
  windData = null,
  shelters = [],
  liveShelters = [],
  showShelters = false,
  stationAnchor = null,
  householdFireTintProximityMiles,
  householdTintNifcFires,
  firefighters = [],
  fillParentHeight = false,
}: Props) {
  const { notEvacuated, evacuated, cannotEvac } = mapStats(pins, householdPins)
  const useHouseholdFireTint =
    householdFireTintProximityMiles != null && householdTintNifcFires != null

  /** ER command hub: tighter legend + regional fitBounds (see FitBoundsCombined). */
  const legendCompact = fillParentHeight

  const sizeClass = fillParentHeight
    ? 'min-h-0'
    : 'min-h-[260px] sm:min-h-[360px] md:min-h-[480px]'

  return (
    <div className={`relative h-full w-full min-w-0 ${sizeClass}`}>
      {demoMode && (
        <div
          className="absolute top-2 left-2 z-[1000] rounded-lg border border-amber-400/70 bg-amber-100/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-lg pointer-events-none dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-200"
        >
          Demo mode
        </div>
      )}
      <MapContainer center={center} zoom={zoom} className="h-full w-full min-h-[inherit] z-0" style={{ height: '100%', width: '100%', minHeight: 'inherit' }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <LeafletInvalidateOnLayout />
        <MapFlyTo target={mapFocusRequest} />
        <FitBoundsCombined
          pins={pins}
          householdPins={householdPins}
          stationAnchor={stationAnchor}
          firefighters={firefighters}
          nifcFires={nifcFires}
          commandHubFraming={fillParentHeight}
          mapCenterFallback={center}
          commandHubFitRadiusMiles={
            fillParentHeight
              ? Math.min(220, Math.max(55, (householdFireTintProximityMiles ?? 50) + 40))
              : null
          }
        />

        {showNifcPredictionOverlays && (
          <NifcFirePredictionOverlay nifc={nifcFires} windData={windData} />
        )}
        <NifcFireMapFeatures nifc={nifcFires} circleMarkersOnly={nifcFiresCircleOnly} />

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
        {showShelters && shelters.filter(s => s.type === 'evacuation').map(s => (
          <Marker key={`shelter-${s.id}`} position={[s.lat, s.lng]} icon={preIdentifiedShelterIcon()}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
                <strong>{s.name}</strong><br />
                📍 Pre-identified — status unconfirmed<br />
                {s.county}<br />
                Typical capacity (estimate): {s.capacity.toLocaleString()}
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Call ahead before traveling.</div>
              </div>
            </Popup>
          </Marker>
        ))}
        {showShelters && shelters.filter(s => s.type === 'animal').map(s => (
          <Marker key={`animal-shelter-${s.id}`} position={[s.lat, s.lng]} icon={shelterIcon('animal')}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
                <strong>{s.name}</strong><br />
                Animal shelter (pre-identified)<br />
                {s.county}
              </div>
            </Popup>
          </Marker>
        ))}

        {firefighters
          .filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng))
          .map(f => (
            <Marker key={`firefighter-${f.id}`} position={[f.lat, f.lng]} icon={firefighterHelmetIcon}>
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 700 }}>
                  🧑‍🚒 {f.name}
                </div>
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 200, fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    🧑‍🚒 {f.name}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>
                    Status: <strong style={{ color: '#0f172a' }}>{f.status}</strong>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                    Last seen: {ffSeenLabel(f.last_seen_at)}
                  </div>
                  {f.current_assignment?.trim() && (
                    <div style={{ marginTop: 8, fontSize: 11 }}>
                      <span style={{ color: '#64748b' }}>Assignment:</span>{' '}
                      {f.current_assignment.trim()}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

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

        {pins.map(pin => {
          const home = pinHomeEvacuationStatus(pin)
          const fill = HOME_STATUS_COLOR[home]
          const homeLabel = labelForHomeEvacuationStatus(home)
          const mobility = pin.mobility_needs?.length ? pin.mobility_needs : []
          const medical = pin.medical_needs?.length ? pin.medical_needs : []
          const lifeEq = pinShowsLifeEquipment(pin) && medical.length === 0
          const ttOther =
            [truncate(pin.disability_other, 50), truncate(pin.medical_other, 50)].filter(Boolean).join(' · ')
          return (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lon]}
            radius={9}
            pathOptions={{
              color: fill,
              fillColor: fill,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div style={{ maxWidth: 260, fontFamily: 'sans-serif', fontSize: 10, lineHeight: 1.35 }}>
                {pin.is_demo && (
                  <div style={{ fontSize: 8, fontWeight: 800, color: '#a8a29e', letterSpacing: '0.06em', marginBottom: 4 }}>
                    DEMO
                  </div>
                )}
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{pin.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: fill + '22',
                      color: fill,
                      fontWeight: 700,
                      fontSize: 10,
                    }}
                  >
                    <span style={{ fontSize: 12 }} aria-hidden>
                      {home === 'evacuated' ? '✓' : home === 'cannot_evacuate' ? '⚠' : '🏠'}
                    </span>
                    {homeLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                  {mobility.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: 'rgba(100,116,139,0.25)',
                        color: '#334155',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {medical.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: 'rgba(59,130,246,0.2)',
                        color: '#1d4ed8',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {lifeEq && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: 6,
                        background: 'rgba(59,130,246,0.2)',
                        color: '#1d4ed8',
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      ⚕️ Life equipment
                    </span>
                  )}
                </div>
                {ttOther && (
                  <div style={{ color: '#64748b', fontSize: 9 }}>{ttOther}</div>
                )}
              </div>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                {pin.is_demo && (
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#78716c', letterSpacing: '0.08em', marginBottom: 6 }}>
                    DEMO
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{pin.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{pin.address}</div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: fill + '22',
                  color: fill,
                  fontWeight: 600,
                  fontSize: 11,
                  marginBottom: pin.phone ? 6 : 0,
                }}>
                  <span style={{ fontSize: 13 }} aria-hidden>
                    {home === 'evacuated' ? '✓' : home === 'cannot_evacuate' ? '⚠' : '🏠'}
                  </span>
                  {homeLabel}
                </div>
                {(mobility.length > 0 || medical.length > 0 || lifeEq) && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {mobility.map(tag => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: '#f1f5f9',
                          color: '#334155',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {medical.map(tag => (
                      <span
                        key={tag}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {lifeEq && (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        ⚕️ Life equipment
                      </span>
                    )}
                  </div>
                )}
                {(pin.disability_other || pin.medical_other) && (
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 1.4 }}>
                    {pin.disability_other && (
                      <div><strong>Other (disability):</strong> {pin.disability_other}</div>
                    )}
                    {pin.medical_other && (
                      <div style={{ marginTop: 4 }}><strong>Other (medical):</strong> {pin.medical_other}</div>
                    )}
                  </div>
                )}
                {pin.phone && (
                  <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>
                    📞 {pin.phone}
                  </div>
                )}
                {pin.special_needs &&
                  !pin.mobility_needs?.length &&
                  !pin.medical_needs?.length &&
                  !pin.medical_other?.trim() &&
                  !pin.disability_other?.trim() && (
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 6, fontWeight: 600 }}>
                    ⚠ {pin.special_needs}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )})}

        <HouseholdPinMapFeatures
          householdPins={householdPins}
          onUpdated={onResponderStatusUpdated}
          proximityMiles={householdFireTintProximityMiles}
          proximityFires={householdTintNifcFires}
        />

        {stationAnchor != null
          && Number.isFinite(stationAnchor.lat)
          && Number.isFinite(stationAnchor.lng) && (
          <Marker
            position={[stationAnchor.lat, stationAnchor.lng]}
            icon={getFireStationMapIcon()}
            zIndexOffset={900}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.6, minWidth: 200 }}>
                <strong>Fire station / command anchor</strong>
                {stationAnchor.label?.trim() ? (
                  <>
                    <br />
                    <span style={{ color: '#475569', fontSize: 12 }}>{stationAnchor.label.trim()}</span>
                  </>
                ) : null}
              </div>
            </Popup>
          </Marker>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: legendCompact ? 8 : 28,
            right: legendCompact ? 6 : 10,
            zIndex: 1000,
            maxWidth: legendCompact ? 200 : 280,
            maxHeight: legendCompact ? 'min(38vh, 188px)' : undefined,
            overflowY: legendCompact ? 'auto' : undefined,
            WebkitOverflowScrolling: 'touch',
            background: 'rgba(15,20,30,0.92)',
            borderRadius: legendCompact ? 8 : 10,
            padding: legendCompact ? '6px 8px' : '10px 14px',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: legendCompact ? 'auto' : 'none',
          }}
        >
          {nifcFires.length > 0 && (
            <>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: legendCompact ? 7 : 10,
                  fontWeight: 700,
                  marginBottom: legendCompact ? 4 : 8,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                {legendCompact ? 'Fires (NIFC)' : 'Active fires'}
              </div>
              {legendCompact ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                    fontSize: 8,
                    lineHeight: 1.35,
                    color: '#94a3b8',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                    &lt;25%
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />
                    25–50
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#eab308' }} />
                    50–75
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                    75%+
                  </span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                    <span style={{ color: '#fca5a5', fontSize: 11, fontWeight: 600 }}>Spreading</span>
                    <span style={{ color: '#64748b', fontSize: 10 }}>&lt;25% contained</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                    <span style={{ color: '#fdba74', fontSize: 11, fontWeight: 600 }}>Active</span>
                    <span style={{ color: '#64748b', fontSize: 10 }}>25–50%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308', flexShrink: 0 }} />
                    <span style={{ color: '#fde047', fontSize: 11, fontWeight: 600 }}>Partial</span>
                    <span style={{ color: '#64748b', fontSize: 10 }}>50–75%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    <span style={{ color: '#86efac', fontSize: 11, fontWeight: 600 }}>Controlled</span>
                    <span style={{ color: '#64748b', fontSize: 10 }}>75%+</span>
                  </div>
                </>
              )}
            </>
          )}
          {stationAnchor != null
            && Number.isFinite(stationAnchor.lat)
            && Number.isFinite(stationAnchor.lng) && (
            <>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: legendCompact ? 7 : 10,
                  fontWeight: 700,
                  marginBottom: legendCompact ? 3 : 8,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Station
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: legendCompact ? 5 : 8, marginBottom: legendCompact ? 6 : 10 }}>
                <div
                  style={{
                    flexShrink: 0,
                    transform: legendCompact ? 'scale(0.55)' : 'scale(0.72)',
                    transformOrigin: 'left center',
                    width: 24,
                    height: 24,
                  }}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: fireStationMarkerImgHtml(32) }}
                />
                <div>
                  <div style={{ color: '#cbd5e1', fontSize: legendCompact ? 9 : 11, fontWeight: 600, lineHeight: 1.2 }}>Your station</div>
                  {!legendCompact && (
                    <div style={{ color: '#64748b', fontSize: 10, lineHeight: 1.3 }}>Command map anchor</div>
                  )}
                </div>
              </div>
            </>
          )}
          {householdPins.length > 0 && (
            <>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: legendCompact ? 7 : 10,
                  fontWeight: 700,
                  marginBottom: legendCompact ? 2 : 4,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                {legendCompact ? 'Homes & work' : 'Evacuees & work sites'}
              </div>
              {!legendCompact && (
                <div style={{ color: '#64748b', fontSize: 9, lineHeight: 1.35, marginBottom: 6 }}>
                  House = home · Building = office — same ring colors for both.
                </div>
              )}
              {([
                { tint: 'neutral' as const, homeLabel: legendCompact ? 'Not cleared' : 'Not cleared (home or office)', sub: legendCompact ? '' : 'Still at address / grey ring' },
                { tint: 'cleared' as const, homeLabel: legendCompact ? 'Cleared' : 'Evacuated / cleared', sub: legendCompact ? '' : 'Left home or work site' },
                { tint: 'needs_action' as const, homeLabel: 'Cannot evacuate / needs action', sub: legendCompact ? '' : 'EMS or transport — home or office' },
              ]).map(row => (
                <div
                  key={row.tint}
                  style={{ display: 'flex', alignItems: 'center', gap: legendCompact ? 4 : 8, marginBottom: legendCompact ? 4 : 7 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <div
                      style={{
                        transform: legendCompact ? 'scale(0.48)' : 'scale(0.62)',
                        transformOrigin: 'left center',
                        width: 22,
                        height: 22,
                      }}
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: responderEvacueeMarkerHtmlTint(row.tint, 'home') }}
                    />
                    <div
                      style={{
                        transform: legendCompact ? 'scale(0.48)' : 'scale(0.62)',
                        transformOrigin: 'left center',
                        width: 22,
                        height: 22,
                        marginLeft: -6,
                      }}
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: responderEvacueeMarkerHtmlTint(row.tint, 'office') }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        color: row.tint === 'cleared' ? '#4ade80' : row.tint === 'needs_action' ? '#f87171' : '#cbd5e1',
                        fontSize: legendCompact ? 8 : 11,
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                    >
                      {row.homeLabel}
                    </div>
                    {row.sub ? (
                      <div style={{ color: '#64748b', fontSize: 9, lineHeight: 1.3 }}>{row.sub}</div>
                    ) : null}
                  </div>
                </div>
              ))}

            </>
          )}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              marginTop: legendCompact ? 4 : 8,
              paddingTop: legendCompact ? 4 : 8,
              display: 'flex',
              flexDirection: legendCompact ? 'row' : 'column',
              flexWrap: legendCompact ? 'wrap' : undefined,
              gap: legendCompact ? 6 : 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: legendCompact ? 6 : 8, height: legendCompact ? 6 : 8, borderRadius: '50%', background: '#64748b', flexShrink: 0 }} />
              <span style={{ color: '#94a3b8', fontSize: legendCompact ? 8 : 11 }}>
                {notEvacuated} {legendCompact ? 'not out' : 'not evacuated'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: legendCompact ? 6 : 8, height: legendCompact ? 6 : 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ color: '#4ade80', fontSize: legendCompact ? 8 : 11, fontWeight: 600 }}>
                {evacuated} {legendCompact ? 'out' : 'evacuated'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: legendCompact ? 6 : 8, height: legendCompact ? 6 : 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
              <span style={{ color: '#f87171', fontSize: legendCompact ? 8 : 11, fontWeight: 600 }}>
                {cannotEvac} {legendCompact ? 'cannot' : 'cannot evacuate'}
              </span>
            </div>
          </div>
        </div>
      </MapContainer>
      {windData && <WindCompassOverlay wind={windData} />}
    </div>
  )
}

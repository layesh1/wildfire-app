'use client'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import type { HazardFacility, FacilityType } from '@/lib/hazard-facilities'
import LeafletInvalidateOnLayout from '@/components/leaflet/LeafletInvalidateOnLayout'
import {
  mapLegacyCheckinToDual,
  labelForHomeEvacuationStatus,
  type HomeEvacuationStatus,
} from '@/lib/checkin-status'

export interface EvacueePin {
  id: string
  name: string
  address: string
  lat: number
  lon: number
  status: 'evacuated' | 'sheltering' | 'returning' | 'unknown'
  phone?: string
  special_needs?: string
  /** Short tags from onboarding / profile (responder map). */
  mobility_needs?: string[]
  medical_needs?: string[]
  disability_other?: string
  medical_other?: string
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

/** Maps demo pin legacy status → home evacuation model (display only; does not mutate pins). */
function pinHomeEvacuationStatus(pin: EvacueePin): HomeEvacuationStatus {
  return mapLegacyCheckinToDual(pin.status).home
}

const HOME_STATUS_COLOR: Record<HomeEvacuationStatus, string> = {
  not_evacuated: '#f59e0b',
  evacuated: '#22c55e',
  cannot_evacuate: '#ef4444',
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

function FitBounds({ pins }: { pins: EvacueePin[] }) {
  const map = useMap()
  useEffect(() => {
    if (pins.length === 0) return
    const lats = pins.map(p => p.lat)
    const lons = pins.map(p => p.lon)
    map.fitBounds(
      [[Math.min(...lats) - 0.01, Math.min(...lons) - 0.01],
       [Math.max(...lats) + 0.01, Math.max(...lons) + 0.01]],
      { maxZoom: 14 }
    )
  }, [pins, map])
  return null
}

/** Leaflet often renders a gray/blank map after tab changes, split view resize, or Safari side tab — force a size recalc. */
function InvalidateOnLayout() {
  const map = useMap()
  useEffect(() => {
    function invalidate() {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false })
        } catch {
          /* ignore */
        }
      })
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') invalidate()
    }
    window.addEventListener('resize', invalidate)
    document.addEventListener('visibilitychange', onVisibility)
    let ro: ResizeObserver | null = null
    const el = map.getContainer()
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(invalidate)
      ro.observe(el)
    }
    invalidate()
    return () => {
      window.removeEventListener('resize', invalidate)
      document.removeEventListener('visibilitychange', onVisibility)
      ro?.disconnect()
    }
  }, [map])
  return null
}

interface Props {
  pins: EvacueePin[]
  center?: [number, number]
  zoom?: number
  facilities?: HazardFacility[]
  showFacilities?: boolean
}

export default function EvacueeStatusMap({ pins, center = [35.4088, -80.5795], zoom = 12, facilities = [], showFacilities = false }: Props) {
  const notEvacuated = pins.filter(p => pinHomeEvacuationStatus(p) === 'not_evacuated').length
  const evacuated = pins.filter(p => pinHomeEvacuationStatus(p) === 'evacuated').length
  const cannotEvac = pins.filter(p => pinHomeEvacuationStatus(p) === 'cannot_evacuate').length

  return (
    <div className="relative h-full min-h-[260px] sm:min-h-[360px] md:min-h-[480px] w-full min-w-0">
      <MapContainer center={center} zoom={zoom} className="h-full w-full min-h-[inherit] z-0" style={{ height: '100%', width: '100%', minHeight: 'inherit' }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <LeafletInvalidateOnLayout />
        <FitBounds pins={pins} />
        {pins.map(pin => {
          const home = pinHomeEvacuationStatus(pin)
          const fill = HOME_STATUS_COLOR[home]
          const homeLabel = labelForHomeEvacuationStatus(home)
          const mobility = pin.mobility_needs?.length ? pin.mobility_needs : []
          const lifeEq = pinShowsLifeEquipment(pin)
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
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{pin.name}</div>
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
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{pin.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{pin.address}</div>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: fill + '22',
                  color: fill,
                  fontWeight: 600,
                  fontSize: 11,
                  marginBottom: pin.phone || pin.special_needs ? 6 : 0,
                }}>
                  {homeLabel}
                </div>
                {(mobility.length > 0 || lifeEq) && (
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
                {home === 'cannot_evacuate' && pin.special_needs && (
                  <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 8, fontWeight: 700, borderTop: '1px solid #fecaca', paddingTop: 6 }}>
                    Mobility / needs: {pin.special_needs}
                  </div>
                )}
                {pin.phone && (
                  <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>
                    📞 {pin.phone}
                  </div>
                )}
                {pin.special_needs && home !== 'cannot_evacuate' && (
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 3, fontWeight: 600 }}>
                    ⚠ {pin.special_needs}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )})}

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

        {/* Legend overlay */}
        <div style={{
          position: 'absolute', bottom: 28, right: 10, zIndex: 1000,
          background: 'rgba(15,20,30,0.92)', borderRadius: 10,
          padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}>
          <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>
            HOME STATUS
          </div>
          {(Object.entries(HOME_STATUS_COLOR) as [HomeEvacuationStatus, string][]).map(([s, color]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ color: '#e2e8f0', fontSize: 10 }}>{labelForHomeEvacuationStatus(s)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, paddingTop: 8 }}>
            <span style={{ color: '#64748b', fontWeight: 700, fontSize: 11 }}>{notEvacuated} not evacuated</span>
            <span style={{ color: '#64748b', fontSize: 11 }}> · </span>
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 11 }}>{evacuated} evacuated</span>
            <span style={{ color: '#64748b', fontSize: 11 }}> · </span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>{cannotEvac} cannot evacuate</span>
          </div>
        </div>
      </MapContainer>
    </div>
  )
}

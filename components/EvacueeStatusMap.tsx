'use client'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useState } from 'react'
import type { HazardFacility, FacilityType } from '@/lib/hazard-facilities'
import LeafletInvalidateOnLayout from '@/components/leaflet/LeafletInvalidateOnLayout'
import {
  resolvePinHomeEvacuationStatus,
  labelForHomeEvacuationStatus,
  isHomeEvacuationStatus,
  type HomeEvacuationStatus,
} from '@/lib/checkin-status'
import type { HouseholdPin } from '@/lib/responder-household'
import type { NifcFire, WindData } from '@/app/dashboard/caregiver/map/LeafletMap'
import NifcFireMapFeatures from '@/components/leaflet/NifcFireMapFeatures'
import WindCompassOverlay from '@/components/leaflet/WindCompassOverlay'

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

const PRIORITY_COLOR: Record<HouseholdPin['priority'], string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MONITOR: '#eab308',
  CLEAR: '#22c55e',
}

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

function mobilityEmojiTag(s: string): string {
  const x = s.toLowerCase()
  if (x.includes('wheelchair') || x.includes('mobility device')) return `🦽 ${s}`
  if (x.includes('bedridden') || x.includes('limited mobility')) return `🛏️ ${s}`
  if (x.includes('walk') || x.includes('distance') || x.includes('assistance')) return `🚶 ${s}`
  return s
}

function medicalEmojiTag(s: string): string {
  const x = s.toLowerCase()
  if (x.includes('oxygen') || x.includes('ventilator')) return `🫁 ${s}`
  if (x.includes('dialysis')) return `🫘 ${s}`
  return s
}

function memberHomeLabel(s: string): string {
  const h = isHomeEvacuationStatus(s) ? s : 'not_evacuated'
  return labelForHomeEvacuationStatus(h)
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
    if (!target) return
    map.flyTo([target.lat, target.lng], 15, { duration: 0.85 })
  }, [map, target?.lat, target?.lng, target?.nonce])
  return null
}

function FitBoundsCombined({ pins, householdPins }: { pins: EvacueePin[]; householdPins: HouseholdPin[] }) {
  const map = useMap()
  useEffect(() => {
    const pts: [number, number][] = [
      ...pins.map(p => [p.lat, p.lon] as [number, number]),
      ...householdPins.map(h => [h.lat, h.lng] as [number, number]),
    ]
    if (pts.length === 0) return
    const lats = pts.map(p => p[0])
    const lons = pts.map(p => p[1])
    map.fitBounds(
      [[Math.min(...lats) - 0.01, Math.min(...lons) - 0.01],
       [Math.max(...lats) + 0.01, Math.max(...lons) + 0.01]],
      { maxZoom: 14 }
    )
  }, [pins, householdPins, map])
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

function HouseholdPopupBody({
  pin,
  onUpdated,
}: {
  pin: HouseholdPin
  onUpdated?: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const patch = useCallback(
    async (userId: string, status: HomeEvacuationStatus) => {
      setBusy(userId)
      setErr(null)
      try {
        const res = await fetch('/api/responder/update-status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, status }),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) throw new Error(j.error || res.statusText)
        onUpdated?.()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Update failed')
      } finally {
        setBusy(null)
      }
    },
    [onUpdated]
  )

  const urgent = pin.members.filter(m => m.home_evacuation_status === 'cannot_evacuate')

  return (
    <div style={{ minWidth: 260, maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12 }}>
      {pin.is_demo && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: '#78716c',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          DEMO
        </div>
      )}
      {urgent.map(m => (
        <div
          key={m.id}
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontWeight: 700,
            fontSize: 11,
            padding: '8px 10px',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          ⚠️ PRIORITY — {m.name} cannot evacuate
        </div>
      ))}
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{pin.address}</div>
      <div style={{ color: '#475569', marginBottom: 12, fontSize: 11 }}>
        {pin.evacuated} of {pin.total_people} people evacuated
      </div>
      {err && (
        <div style={{ color: '#b91c1c', fontSize: 11, marginBottom: 8 }}>{err}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pin.members.map(m => {
          const st = isHomeEvacuationStatus(m.home_evacuation_status)
            ? m.home_evacuation_status
            : 'not_evacuated'
          const fill = HOME_STATUS_COLOR[st]
          const label = memberHomeLabel(m.home_evacuation_status)
          const icon = st === 'evacuated' ? '✓' : st === 'cannot_evacuate' ? '⚠' : '🏠'
          return (
            <div
              key={m.id}
              style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 2 }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{m.name}</div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 10px',
                  borderRadius: 10,
                  background: fill + '22',
                  color: fill,
                  fontWeight: 600,
                  fontSize: 11,
                  marginBottom: 6,
                }}
              >
                <span aria-hidden>{icon}</span>
                {label}
              </div>
              {(m.mobility_needs.length > 0 || m.medical_needs.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {m.mobility_needs.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 8,
                        background: '#f1f5f9',
                        color: '#334155',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {mobilityEmojiTag(tag)}
                    </span>
                  ))}
                  {m.medical_needs.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 8,
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {medicalEmojiTag(tag)}
                    </span>
                  ))}
                </div>
              )}
              {(m.disability_other || m.medical_other) && (
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, lineHeight: 1.35 }}>
                  {m.disability_other && <div>{m.disability_other}</div>}
                  {m.medical_other && <div>{m.medical_other}</div>}
                </div>
              )}
              {m.work_address?.trim() && (
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                  Work: {m.work_address}
                </div>
              )}
              {m.phone && (
                <div style={{ fontSize: 11, color: '#334155', marginBottom: 8 }}>📞 {m.phone}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => patch(m.id, 'evacuated')}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #86efac',
                    background: '#f0fdf4',
                    color: '#166534',
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  ✓ Checked — Evacuated
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => patch(m.id, 'cannot_evacuate')}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  ✓ Checked — Needs EMS
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
  /** When true, draw fires as circle markers only (e.g. responder evacuation map). */
  nifcFiresCircleOnly?: boolean
  windData?: WindData | null
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
  windData = null,
}: Props) {
  const { notEvacuated, evacuated, cannotEvac } = mapStats(pins, householdPins)

  return (
    <div className="relative h-full min-h-[260px] sm:min-h-[360px] md:min-h-[480px] w-full min-w-0">
      <style>{`
        @keyframes wf-household-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .wf-household-critical path {
          animation: wf-household-pulse 1.25s ease-in-out infinite;
        }
      `}</style>
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
        <FitBoundsCombined pins={pins} householdPins={householdPins} />

        <NifcFireMapFeatures nifc={nifcFires} circleMarkersOnly={nifcFiresCircleOnly} />

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

        {householdPins.map(pin => {
          const fill = PRIORITY_COLOR[pin.priority]
          const pathClass = pin.priority === 'CRITICAL' ? 'wf-household-critical' : ''
          const label =
            pin.total_people === 1
              ? (() => {
                  const m = pin.members[0]
                  if (!m) return '·'
                  const st = isHomeEvacuationStatus(m.home_evacuation_status)
                    ? m.home_evacuation_status
                    : 'not_evacuated'
                  return st === 'evacuated' ? '✓' : st === 'cannot_evacuate' ? '⚠' : '🏠'
                })()
              : `${pin.evacuated}/${pin.total_people}`

          return (
            <CircleMarker
              key={pin.id}
              center={[pin.lat, pin.lng]}
              radius={12}
              pathOptions={{
                className: pathClass,
                color: fill,
                fillColor: fill,
                fillOpacity: 0.88,
                weight: 2,
              }}
            >
              <Tooltip direction="center" permanent opacity={1}>
                <span
                  style={{
                    fontFamily: 'sans-serif',
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#0f172a',
                    textShadow: '0 0 2px #fff, 0 0 4px #fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {pin.is_demo && (
                    <span style={{ fontSize: 7, fontWeight: 800, color: '#a8a29e', letterSpacing: '0.08em' }}>
                      DEMO
                    </span>
                  )}
                  <span>{label}</span>
                </span>
              </Tooltip>
              <Popup>
                <HouseholdPopupBody pin={pin} onUpdated={onResponderStatusUpdated} />
              </Popup>
            </CircleMarker>
          )
        })}

        <div style={{
          position: 'absolute', bottom: 28, right: 10, zIndex: 1000,
          background: 'rgba(15,20,30,0.92)', borderRadius: 10,
          padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}>
          {nifcFires.length > 0 && (
            <>
              <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>
                WILDFIRE (NIFC)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <span style={{ color: '#e2e8f0', fontSize: 10 }}>&lt;25% contained</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                <span style={{ color: '#e2e8f0', fontSize: 10 }}>25–50%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', flexShrink: 0 }} />
                <span style={{ color: '#e2e8f0', fontSize: 10 }}>50–75%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                <span style={{ color: '#e2e8f0', fontSize: 10 }}>75%+ contained</span>
              </div>
            </>
          )}
          <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>
            HOME STATUS
          </div>
          {(Object.entries(HOME_STATUS_COLOR) as [HomeEvacuationStatus, string][]).map(([s, color]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ color: '#e2e8f0', fontSize: 10 }}>{labelForHomeEvacuationStatus(s)}</span>
            </div>
          ))}
          {householdPins.length > 0 && (
            <>
              <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 4 }}>
                HOUSEHOLD PRIORITY
              </div>
              {(Object.entries(PRIORITY_COLOR) as [HouseholdPin['priority'], string][]).map(([p, color]) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ color: '#e2e8f0', fontSize: 9 }}>{p}</span>
                </div>
              ))}
            </>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, paddingTop: 8 }}>
            <span style={{ color: '#64748b', fontWeight: 700, fontSize: 11 }}>{notEvacuated} not evacuated</span>
            <span style={{ color: '#64748b', fontSize: 11 }}> · </span>
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 11 }}>{evacuated} evacuated</span>
            <span style={{ color: '#64748b', fontSize: 11 }}> · </span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>{cannotEvac} cannot evacuate</span>
          </div>
        </div>
      </MapContainer>
      {windData && <WindCompassOverlay wind={windData} />}
    </div>
  )
}

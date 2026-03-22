'use client'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import type { HazardFacility, FacilityType } from '@/lib/hazard-facilities'

export interface EvacueePin {
  id: string
  name: string
  address: string
  lat: number
  lon: number
  status: 'evacuated' | 'sheltering' | 'returning' | 'unknown'
  phone?: string
  special_needs?: string
}

const STATUS_COLOR: Record<EvacueePin['status'], string> = {
  evacuated: '#22c55e',   // green
  sheltering: '#f59e0b',  // amber
  returning: '#3b82f6',   // blue
  unknown: '#ef4444',     // red
}

const STATUS_LABEL: Record<EvacueePin['status'], string> = {
  evacuated: 'Evacuated — Safe',
  sheltering: 'Sheltering in Place',
  returning: 'Returning Home',
  unknown: 'Not Evacuated / Needs Help',
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

interface Props {
  pins: EvacueePin[]
  center?: [number, number]
  zoom?: number
  facilities?: HazardFacility[]
  showFacilities?: boolean
}

export default function EvacueeStatusMap({ pins, center = [35.4088, -80.5795], zoom = 12, facilities = [], showFacilities = false }: Props) {
  const notEvacuated = pins.filter(p => p.status === 'unknown').length
  const evacuated = pins.filter(p => p.status === 'evacuated').length

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 480 }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds pins={pins} />
        {pins.map(pin => (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lon]}
            radius={9}
            pathOptions={{
              color: STATUS_COLOR[pin.status],
              fillColor: STATUS_COLOR[pin.status],
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{pin.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{pin.address}</div>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: STATUS_COLOR[pin.status] + '22',
                  color: STATUS_COLOR[pin.status],
                  fontWeight: 600,
                  fontSize: 11,
                  marginBottom: pin.phone || pin.special_needs ? 6 : 0,
                }}>
                  {STATUS_LABEL[pin.status]}
                </div>
                {pin.phone && (
                  <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>
                    📞 {pin.phone}
                  </div>
                )}
                {pin.special_needs && (
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 3, fontWeight: 600 }}>
                    ⚠ {pin.special_needs}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
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

        {/* Legend overlay */}
        <div style={{
          position: 'absolute', bottom: 28, right: 10, zIndex: 1000,
          background: 'rgba(15,20,30,0.92)', borderRadius: 10,
          padding: '10px 14px', border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}>
          <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>
            EVACUATION STATUS
          </div>
          {(Object.entries(STATUS_COLOR) as [EvacueePin['status'], string][]).map(([s, color]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ color: '#e2e8f0', fontSize: 10 }}>{STATUS_LABEL[s]}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, paddingTop: 8 }}>
            <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 11 }}>{evacuated} safe</span>
            <span style={{ color: '#64748b', fontSize: 11 }}> · </span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>{notEvacuated} need help</span>
          </div>
        </div>
      </MapContainer>
    </div>
  )
}

'use client'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { generateEllipse, vanWagnerLW } from '@/lib/fire-spread-ellipse'

export interface EvacueeOverlayPin {
  id: string
  name: string
  address: string
  lat: number
  lon: number
  status: 'evacuated' | 'sheltering' | 'returning' | 'unknown'
  special_needs?: string
}

const EVAC_COLOR: Record<EvacueeOverlayPin['status'], string> = {
  evacuated: '#22c55e',
  sheltering: '#f59e0b',
  returning: '#3b82f6',
  unknown: '#ef4444',
}

const EVAC_LABEL: Record<EvacueeOverlayPin['status'], string> = {
  evacuated: 'Evacuated — Safe',
  sheltering: 'Sheltering in Place',
  returning: 'Returning Home',
  unknown: 'NOT Evacuated',
}

const TIME_HORIZONS = [1, 3, 6, 12, 24]
const LABELS = ['1h', '3h', '6h', '12h', '24h']
const STROKE_COLORS = ['#FFF176', '#FFB300', '#FF6F00', '#FF3D00', '#AA0000']
const FILL_OPACITIES = [0.06, 0.08, 0.10, 0.12, 0.14]

interface Props {
  lat: number
  lon: number
  spreadAcres24h: number
  windSpeedMph: number
  windDirDeg: number
  // Active fire mode: show current burn extent as an additional polygon
  currentAcres?: number
  // Evacuation status overlay
  evacuees?: EvacueeOverlayPin[]
}

export default function FireSpreadMap({ lat, lon, spreadAcres24h, windSpeedMph, windDirDeg, currentAcres, evacuees = [] }: Props) {
  const LW = vanWagnerLW(windSpeedMph)
  const e = Math.sqrt(Math.max(0, 1 - 1 / (LW * LW)))
  const headDir = (windDirDeg + 180) % 360

  // Current burn polygon (active fire mode only)
  const currentPolygon = currentAcres && currentAcres > 0 ? (() => {
    const area_m2 = currentAcres * 4047
    const b_m = Math.sqrt(Math.max(area_m2 / (Math.PI * LW), 100))
    const a_m = b_m * LW
    const c_m = a_m * e
    return generateEllipse(lat, lon, a_m, b_m, c_m, headDir)
  })() : null

  // Growth projections (relative to current state in active mode, from ignition in scenario mode)
  const ellipses = TIME_HORIZONS.map((t, i) => {
    const area_m2 = spreadAcres24h * (t / 24) * 4047
    const b_m = Math.sqrt(Math.max(area_m2 / (Math.PI * LW), 100))
    const a_m = b_m * LW
    const c_m = a_m * e
    return {
      t,
      label: LABELS[i],
      color: STROKE_COLORS[i],
      fillOpacity: FILL_OPACITIES[i],
      points: generateEllipse(lat, lon, a_m, b_m, c_m, headDir),
    }
  })

  return (
    <div style={{ height: 380, borderRadius: 8, overflow: 'hidden', border: '1px solid #30363d' }}>
      <MapContainer
        center={[lat, lon]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {[...ellipses].reverse().map(({ t, label, color, fillOpacity, points }) => (
          <Polygon key={t} positions={points}
            pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity }}>
            <Popup>
              <strong>+{label} projected perimeter</strong><br />
              {label === '24h' ? `~${spreadAcres24h.toLocaleString()} ac total` : ''}
            </Popup>
          </Polygon>
        ))}
        {/* Current burn area — drawn on top with distinct style */}
        {currentPolygon && (
          <Polygon positions={currentPolygon}
            pathOptions={{ color: '#FF6600', weight: 2.5, fillColor: '#FF4400', fillOpacity: 0.35, dashArray: '6 3' }}>
            <Popup><strong>Current burn perimeter</strong><br />{currentAcres?.toLocaleString()} acres already burned</Popup>
          </Polygon>
        )}
        <CircleMarker center={[lat, lon]} radius={7}
          pathOptions={{ color: '#FF3333', fillColor: '#FF5555', fillOpacity: 0.95, weight: 2 }}>
          <Popup>{currentAcres ? 'Ignition / report point' : 'Ignition point'}</Popup>
        </CircleMarker>

        {/* Evacuation status overlay */}
        {evacuees.map(pin => (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lon]}
            radius={8}
            pathOptions={{
              color: EVAC_COLOR[pin.status],
              fillColor: EVAC_COLOR[pin.status],
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{pin.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{pin.address}</div>
                <div style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                  background: EVAC_COLOR[pin.status] + '22', color: EVAC_COLOR[pin.status],
                  fontWeight: 600, fontSize: 11,
                }}>
                  {EVAC_LABEL[pin.status]}
                </div>
                {pin.special_needs && (
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 4, fontWeight: 600 }}>
                    ⚠ {pin.special_needs}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

'use client'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const TIME_HORIZONS = [1, 3, 6, 12, 24]
const LABELS = ['1h', '3h', '6h', '12h', '24h']
const STROKE_COLORS = ['#FFF176', '#FFB300', '#FF6F00', '#FF3D00', '#AA0000']
const FILL_OPACITIES = [0.06, 0.08, 0.10, 0.12, 0.14]

function vanWagnerLW(windSpeedMph: number): number {
  const u = windSpeedMph * 0.44704
  return Math.min(8, Math.max(1.0, 0.936 * Math.exp(0.2566 * u) + 0.461 * Math.exp(-0.1548 * u) - 0.397))
}

function generateEllipse(
  lat: number, lon: number,
  a_m: number, b_m: number, c_m: number,
  headDirDeg: number,
  nPts = 72,
): [number, number][] {
  const theta = (headDirDeg * Math.PI) / 180
  const cosLat = Math.cos((lat * Math.PI) / 180)
  return Array.from({ length: nPts + 1 }, (_, i) => {
    const phi = (2 * Math.PI * i) / nPts
    const x = a_m * Math.cos(phi) - c_m
    const y = b_m * Math.sin(phi)
    const dE = x * Math.sin(theta) + y * Math.cos(theta)
    const dN = x * Math.cos(theta) - y * Math.sin(theta)
    return [lat + dN / 111320, lon + dE / (111320 * cosLat)] as [number, number]
  })
}

interface Props {
  lat: number
  lon: number
  spreadAcres24h: number
  windSpeedMph: number
  windDirDeg: number
  // Active fire mode: show current burn extent as an additional polygon
  currentAcres?: number
}

export default function FireSpreadMap({ lat, lon, spreadAcres24h, windSpeedMph, windDirDeg, currentAcres }: Props) {
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
      </MapContainer>
    </div>
  )
}

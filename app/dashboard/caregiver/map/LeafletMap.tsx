'use client'
import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export interface FirmsPoint {
  latitude: string
  longitude: string
  brightness: string
  confidence: string
  frp: string
  acq_date: string
  satellite: string
}

export interface NifcFire {
  id: string
  latitude: number
  longitude: number
  fire_name: string
  acres: number | null
  containment: number | null
  source: 'nifc_perimeter' | 'nifc_incident'
}

// Kept for sidebar typing in page.tsx
export interface FireEvent {
  id: string
  incident_name?: string
  latitude: number
  longitude: number
  county?: string
  state?: string
  acres_burned?: number
  has_evacuation_order: boolean
  signal_gap_hours?: number
  svi_score?: number
}

interface FirmsCluster {
  lat: number
  lng: number
  count: number
  avgFrp: number
  date: string
}

interface Props {
  firms: FirmsPoint[]
  nifc: NifcFire[]
  showFirms: boolean
  showNifc: boolean
  center: [number, number]
}

/** Cluster FIRMS detections into 0.3° grid cells to keep DOM count manageable */
function clusterFirms(firms: FirmsPoint[]): FirmsCluster[] {
  const GRID = 0.3
  const cells: Record<string, FirmsCluster> = {}
  for (const f of firms) {
    const lat = parseFloat(f.latitude)
    const lng = parseFloat(f.longitude)
    if (isNaN(lat) || isNaN(lng)) continue
    const key = `${Math.round(lat / GRID)},${Math.round(lng / GRID)}`
    if (!cells[key]) {
      cells[key] = { lat, lng, count: 0, avgFrp: 0, date: f.acq_date }
    }
    cells[key].count++
    cells[key].avgFrp += parseFloat(f.frp) || 0
  }
  return Object.values(cells).map(c => ({ ...c, avgFrp: c.avgFrp / c.count }))
}

export default function LeafletMap({ firms, nifc, showFirms, showNifc, center }: Props) {
  const firmsClusters = useMemo(() => clusterFirms(firms), [firms])

  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* NASA FIRMS — clustered by 0.3° grid */}
      {showFirms && firmsClusters.map((c, i) => {
        const radius = Math.min(4 + Math.log1p(c.count) * 3 + c.avgFrp / 30, 18)
        return (
          <CircleMarker
            key={`firms-${i}`}
            center={[c.lat, c.lng]}
            radius={radius}
            pathOptions={{ color: '#fbbf24', fillColor: '#f59e0b', fillOpacity: 0.75, weight: 0 }}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.5 }}>
                <strong>NASA FIRMS Cluster</strong><br />
                Detections: {c.count}<br />
                Avg Fire Power: {c.avgFrp.toFixed(0)} MW<br />
                Latest: {c.date}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* NIFC current active fires */}
      {showNifc && nifc.map((f) => (
        <CircleMarker
          key={f.id}
          center={[f.latitude, f.longitude]}
          radius={10}
          pathOptions={{ color: '#ef4444', fillColor: '#dc2626', fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.6 }}>
              <strong style={{ color: '#dc2626' }}>🔴 {f.fire_name}</strong><br />
              {f.source === 'nifc_perimeter' ? 'NIFC Perimeter' : 'NIFC Incident'}<br />
              {f.acres != null && <>{f.acres.toLocaleString(undefined, { maximumFractionDigits: 0 })} acres<br /></>}
              {f.containment != null && <>Containment: {f.containment}%<br /></>}
              <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ ACTIVE FIRE</span>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

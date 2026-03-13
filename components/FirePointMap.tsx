'use client'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export interface FirePoint {
  id: string
  name: string
  state: string
  county: string
  acres: number
  lat: number
  lng: number
  // WiDS fields (optional in live mode)
  svi?: number
  has_order?: boolean
  gap_hours?: number | null
  spread_rate?: string
  // NIFC live fields (optional in WiDS mode)
  contained_pct?: number
  cause?: string
  is_live?: boolean
  updated?: string | null
}

interface Props {
  fires: FirePoint[]
  selected: FirePoint | null
  onSelect: (f: FirePoint | null) => void
  center?: [number, number]
  zoom?: number
}

function getColor(fire: FirePoint): string {
  if (fire.is_live) {
    const c = fire.contained_pct ?? 0
    if (c >= 75) return '#22c55e'
    if (c >= 40) return '#f59e0b'
    if (c >= 10) return '#f97316'
    return '#ef4444'
  }
  if (!fire.has_order) return '#ef4444'
  const svi = fire.svi ?? 0
  if (svi >= 0.7) return '#f59e0b'
  return '#22c55e'
}

export default function FirePointMap({ fires, selected, onSelect, center = [40, -116], zoom = 5 }: Props) {
  return (
    <div style={{ height: 460, borderRadius: 8, overflow: 'hidden', border: '1px solid #30363d' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {fires.map(fire => {
          const color = getColor(fire)
          const r = Math.max(6, Math.min(22, (fire.acres / 25000) + 6))
          const isSelected = selected?.id === fire.id
          return (
            <CircleMarker
              key={fire.id}
              center={[fire.lat, fire.lng]}
              radius={r}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                fillColor: color,
                fillOpacity: isSelected ? 0.95 : 0.75,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(isSelected ? null : fire) }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>{fire.name}</strong>
                  {fire.county && <><br />{fire.county} Co., {fire.state}</>}
                  <br />{fire.acres.toLocaleString()} acres
                  {fire.is_live && fire.contained_pct != null && (
                    <><br /><span style={{ color: fire.contained_pct >= 50 ? '#22c55e' : '#f97316' }}>
                      {fire.contained_pct}% contained
                    </span></>
                  )}
                  {fire.is_live && fire.cause && <><br />Cause: {fire.cause}</>}
                  {!fire.is_live && fire.svi != null && <><br />SVI: {fire.svi.toFixed(2)}</>}
                  {!fire.is_live && <><br />Evac order: {fire.has_order ? `Yes` : 'No'}{fire.gap_hours ? ` (${fire.gap_hours}h gap)` : ''}</>}
                  {fire.spread_rate && <><br />Spread: {fire.spread_rate}</>}
                  {fire.updated && <><br /><span style={{ color: '#888', fontSize: '0.75em' }}>Updated: {new Date(fire.updated).toLocaleDateString()}</span></>}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

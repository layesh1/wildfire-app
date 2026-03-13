'use client'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export interface FirePoint {
  id: string
  name: string
  state: string
  county: string
  acres: number
  svi: number
  lat: number
  lng: number
  has_order: boolean
  gap_hours: number | null
}

interface Props {
  fires: FirePoint[]
  selected: FirePoint | null
  onSelect: (f: FirePoint | null) => void
}

export default function FirePointMap({ fires, selected, onSelect }: Props) {
  return (
    <div style={{ height: 420, borderRadius: 8, overflow: 'hidden', border: '1px solid #30363d' }}>
      <MapContainer
        center={[40, -116]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {fires.map(fire => {
          const color = !fire.has_order ? '#ef4444' : fire.svi >= 0.7 ? '#f59e0b' : '#22c55e'
          const r = Math.max(7, Math.min(20, fire.acres / 28000))
          const isSelected = selected?.id === fire.id
          return (
            <CircleMarker
              key={fire.id}
              center={[fire.lat, fire.lng]}
              radius={r}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                fillColor: color,
                fillOpacity: isSelected ? 0.95 : 0.72,
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(isSelected ? null : fire) }}
            >
              <Popup>
                <strong>{fire.name}</strong><br />
                {fire.county} Co., {fire.state}<br />
                {fire.acres.toLocaleString()} acres · SVI {fire.svi.toFixed(2)}<br />
                Evac order: {fire.has_order ? `Yes (${fire.gap_hours}h gap)` : 'No'}
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

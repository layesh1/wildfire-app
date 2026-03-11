'use client'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface Fire {
  id: string
  incident_name?: string
  latitude: number
  longitude: number
  county?: string
  state?: string
  acres_burned?: number
  has_evacuation_order: boolean
  signal_gap_hours?: number
}

interface Props {
  fires: Fire[]
  center: [number, number]
}

export default function LeafletMap({ fires, center }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {fires.map(fire => (
        <CircleMarker
          key={fire.id}
          center={[fire.latitude, fire.longitude]}
          radius={fire.has_evacuation_order ? 10 : 6}
          pathOptions={{
            color: fire.has_evacuation_order ? '#ef4444' : '#ff6a20',
            fillColor: fire.has_evacuation_order ? '#ef4444' : '#ff6a20',
            fillOpacity: 0.65,
            weight: fire.has_evacuation_order ? 2 : 1,
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.5 }}>
              <strong>{fire.incident_name || 'Unnamed Fire'}</strong><br />
              {fire.county && `${fire.county}, `}{fire.state}
              {fire.acres_burned != null && <><br />{fire.acres_burned.toLocaleString()} acres</>}
              {fire.has_evacuation_order && (
                <><br /><span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ EVACUATION ORDER</span></>
              )}
              {fire.signal_gap_hours != null && (
                <><br />Alert delay: {fire.signal_gap_hours.toFixed(1)}h</>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

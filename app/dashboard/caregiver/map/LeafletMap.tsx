'use client'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

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

export interface FirmsPoint {
  latitude: string
  longitude: string
  brightness: string
  confidence: string
  frp: string
  acq_date: string
  satellite: string
}

interface Props {
  fires: FireEvent[]
  firms: FirmsPoint[]
  center: [number, number]
}

function sviColor(svi?: number) {
  if (svi == null) return '#ff6a20'
  if (svi > 0.75) return '#ef4444'
  if (svi > 0.5) return '#f59e0b'
  return '#22c55e'
}

export default function LeafletMap({ fires, firms, center }: Props) {
  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* NASA FIRMS satellite hotspots */}
      {firms.map((f, i) => {
        const lat = parseFloat(f.latitude)
        const lng = parseFloat(f.longitude)
        if (isNaN(lat) || isNaN(lng)) return null
        const frp = parseFloat(f.frp) || 0
        const radius = Math.min(3 + frp / 20, 12)
        return (
          <CircleMarker
            key={`firms-${i}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 0.7, weight: 0 }}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.5 }}>
                <strong>NASA FIRMS Hotspot</strong><br />
                Satellite: {f.satellite}<br />
                Detected: {f.acq_date}<br />
                Brightness: {f.brightness}K<br />
                Fire Power: {frp.toFixed(0)} MW<br />
                Confidence: {f.confidence}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}

      {/* WiDS dataset fire events with known coordinates */}
      {fires.map(fire => (
        <CircleMarker
          key={fire.id}
          center={[fire.latitude, fire.longitude]}
          radius={fire.has_evacuation_order ? 10 : 7}
          pathOptions={{
            color: fire.has_evacuation_order ? '#ef4444' : sviColor(fire.svi_score),
            fillColor: fire.has_evacuation_order ? '#ef4444' : sviColor(fire.svi_score),
            fillOpacity: 0.75,
            weight: fire.has_evacuation_order ? 2 : 1,
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.6 }}>
              <strong>{fire.incident_name || 'Unnamed Fire'}</strong><br />
              {fire.county && `${fire.county}, `}{fire.state}
              {fire.acres_burned != null && <><br />{fire.acres_burned.toLocaleString()} acres</>}
              {fire.svi_score != null && <><br />SVI: {fire.svi_score.toFixed(3)}</>}
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

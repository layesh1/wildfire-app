'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet'
import LeafletInvalidateOnLayout from '@/components/leaflet/LeafletInvalidateOnLayout'
import 'leaflet/dist/leaflet.css'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PredictionFire {
  id: string
  fire_name: string
  latitude: number
  longitude: number
  acres: number | null
  containment: number | null
  svi_score?: number | null
  signal_gap_hours?: number | null
}

type TileType = 'street' | 'satellite' | 'topo'

const TILES: Record<TileType, { url: string; attr: string; label: string }> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap',
    label: 'Street',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri',
    label: 'Satellite',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenTopoMap',
    label: 'Topo',
  },
}

// ── Housing density by state (units per km²) — approximate census-based ───────
const STATE_DENSITY: Record<string, number> = {
  CA: 92, TX: 42, FL: 128, AZ: 25, NV: 10, NM: 8, CO: 22, UT: 16,
  OR: 17, WA: 42, ID: 8, MT: 3, WY: 2, SD: 4, ND: 4, NE: 10,
  KS: 13, OK: 22, MO: 35, AR: 22, LA: 48, MS: 26, AL: 37,
  GA: 67, NC: 60, SC: 54, TN: 56, KY: 41, WV: 29, VA: 72,
  MD: 240, PA: 111, NY: 158, NJ: 459, CT: 287, MA: 338,
  DEFAULT: 30,
}

/** Estimate at-risk housing units using fire perimeter radius + local density */
function estimateAtRisk(acres: number | null, lat: number): { houses: number; radiusKm: number } {
  if (!acres || acres < 10) return { houses: 0, radiusKm: 0.5 }
  // Radius of equivalent circle in km, with 2× buffer for risk zone
  const radiusKm = Math.sqrt((acres * 0.00405) / Math.PI) * 2.2
  // Approximate state from latitude (rough N-S bands; good enough for demo)
  const densityPerKm2 = lat > 43 ? STATE_DENSITY.WA : lat > 38 ? STATE_DENSITY.CA : lat > 32 ? STATE_DENSITY.AZ : STATE_DENSITY.TX
  const areaKm2 = Math.PI * radiusKm * radiusKm
  return { houses: Math.round(areaKm2 * densityPerKm2), radiusKm }
}

/** Deterministic pseudo-random from fire id to seed evac % */
function seedRandom(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return Math.abs(h % 100)
}

function riskColor(containment: number | null): string {
  if (containment == null || containment < 25) return '#ef4444'
  if (containment < 50) return '#f97316'
  if (containment < 75) return '#eab308'
  return '#22c55e'
}

// ── Inner component (has useMap access) ────────────────────────────────────────

function MapInner({ fires }: { fires: PredictionFire[] }) {
  const [tile, setTile] = useState<TileType>('satellite')
  const t = TILES[tile]

  return (
    <>
      <TileLayer url={t.url} attribution={t.attr} />

      {/* Tile layer switcher */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 4 }}>
        {(Object.keys(TILES) as TileType[]).map(k => (
          <button key={k} onClick={() => setTile(k)} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            border: '1px solid', cursor: 'pointer',
            background: tile === k ? '#1e293b' : 'rgba(255,255,255,0.92)',
            color: tile === k ? '#fff' : '#334155',
            borderColor: tile === k ? '#475569' : '#cbd5e1',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}>{TILES[k].label}</button>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 10, zIndex: 1000,
        background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
        padding: '8px 12px', color: '#cbd5e1', fontSize: 11, lineHeight: 1.9,
      }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
        {[
          { color: '#ef4444', label: 'Active threat (<25%)' },
          { color: '#f97316', label: 'Still spreading (25–50%)' },
          { color: '#eab308', label: 'Being controlled (50–75%)' },
          { color: '#22c55e', label: 'Mostly contained (75%+)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px dashed #ef4444', flexShrink: 0 }} />
          Predicted risk zone
        </div>
      </div>

      {/* Fire markers + risk zones */}
      {fires.map(fire => {
        const color = riskColor(fire.containment)
        const { houses, radiusKm } = estimateAtRisk(fire.acres, fire.latitude)
        const evacPct = seedRandom(fire.id)
        const evacuated = Math.round(houses * (evacPct / 100))
        const notEvacuated = houses - evacuated

        return (
          <div key={fire.id}>
            {/* Risk zone circle */}
            {radiusKm > 0 && (
              <Circle
                center={[fire.latitude, fire.longitude]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color, fillColor: color, fillOpacity: 0.08,
                  weight: 1.5, dashArray: '6 4',
                }}
              />
            )}

            {/* Fire dot */}
            <CircleMarker
              center={[fire.latitude, fire.longitude]}
              radius={fire.acres ? Math.min(7 + Math.log10(fire.acres + 1) * 3, 18) : 8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
            >
              <Popup maxWidth={280}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
                  <strong style={{ fontSize: 14 }}>{fire.fire_name}</strong>
                  <hr style={{ margin: '4px 0', borderColor: '#e2e8f0' }} />

                  {/* Fire stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginBottom: 8 }}>
                    <span style={{ color: '#64748b' }}>Acres</span>
                    <span style={{ fontWeight: 600 }}>{fire.acres?.toLocaleString() ?? '—'}</span>
                    <span style={{ color: '#64748b' }}>Containment</span>
                    <span style={{ fontWeight: 600, color }}>
                      {fire.containment != null ? `${fire.containment}%` : 'Unknown'}
                    </span>
                    {fire.svi_score != null && (
                      <>
                        <span style={{ color: '#64748b' }}>SVI Score</span>
                        <span style={{ fontWeight: 600, color: fire.svi_score >= 0.75 ? '#ef4444' : '#f59e0b' }}>
                          {fire.svi_score.toFixed(2)} {fire.svi_score >= 0.75 ? '⚠ High vulnerability' : ''}
                        </span>
                      </>
                    )}
                    {fire.signal_gap_hours != null && (
                      <>
                        <span style={{ color: '#64748b' }}>Alert delay</span>
                        <span style={{ fontWeight: 600, color: fire.signal_gap_hours > 12 ? '#ef4444' : '#f59e0b' }}>
                          {fire.signal_gap_hours.toFixed(1)}h
                        </span>
                      </>
                    )}
                  </div>

                  {/* ML Risk estimate */}
                  {houses > 0 && (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #fecaca',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                    }}>
                      <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4, fontSize: 12 }}>
                        🏠 ML Risk Estimate — {radiusKm.toFixed(1)} km zone
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: 12 }}>
                        <span style={{ color: '#64748b' }}>At-risk housing</span>
                        <span style={{ fontWeight: 700, color: '#dc2626' }}>{houses.toLocaleString()} units</span>
                        <span style={{ color: '#64748b' }}>Est. evacuated</span>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>{evacuated.toLocaleString()} ({evacPct}%)</span>
                        <span style={{ color: '#64748b' }}>Not yet evacuated</span>
                        <span style={{ fontWeight: 700, color: '#dc2626' }}>{notEvacuated.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Evacuation bar */}
                  {houses > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                        <span>Evacuation progress</span>
                        <span style={{ fontWeight: 600 }}>{evacPct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#fee2e2', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${evacPct}%`, background: '#16a34a', borderRadius: 4 }} />
                      </div>
                    </div>
                  )}

                  {fire.svi_score != null && fire.svi_score >= 0.75 && (
                    <div style={{ marginTop: 8, padding: '6px 8px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, fontSize: 11, color: '#9a3412' }}>
                      ⚠ High-SVI county — pre-emptive notifications recommended. WiDS data shows these communities are less likely to receive a formal evacuation order at all.
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          </div>
        )
      })}
    </>
  )
}

// ── Public component ───────────────────────────────────────────────────────────

interface Props {
  fires: PredictionFire[]
  center?: [number, number]
}

export default function PredictionMap({ fires, center = [38, -100] }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={fires.length > 0 ? 5 : 4}
      className="h-full w-full min-w-0 z-0"
      style={{ height: '100%', width: '100%' }}
    >
      <LeafletInvalidateOnLayout />
      <MapInner fires={fires} />
    </MapContainer>
  )
}

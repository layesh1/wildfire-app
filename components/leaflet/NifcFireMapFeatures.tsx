'use client'

import { CircleMarker, Polygon, Popup } from 'react-leaflet'
import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'
import { containmentColor, containmentRadius, isActiveNifcFire } from '@/lib/nifc-fire-map'

export default function NifcFireMapFeatures({
  nifc,
  /** Match household evacuation map: only point circles (no perimeter polygons). */
  circleMarkersOnly = false,
}: {
  nifc: NifcFire[]
  circleMarkersOnly?: boolean
}) {
  const activeFires = nifc.filter(isActiveNifcFire)

  return (
    <>
      {activeFires.map(f => {
        const color = containmentColor(f.containment)
        const radius = containmentRadius(f.acres)
        const pct = f.containment
        const popup = (
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.7 }}>
              <strong>{f.fire_name}</strong>
              <br />
              {f.acres != null ? (
                <>
                  {f.acres.toLocaleString(undefined, { maximumFractionDigits: 0 })} acres ·{' '}
                </>
              ) : null}
              {pct != null ? `${pct}% contained` : 'containment unknown'}
              <br />
              <span style={{ color, fontWeight: 600 }}>
                {pct == null || pct < 25
                  ? '⚠ Active threat — monitor alerts'
                  : pct < 50
                    ? '⚠ Still spreading — stay ready'
                    : pct < 75
                      ? '↗ Being controlled'
                      : '✓ Mostly contained'}
              </span>
            </div>
          </Popup>
        )
        const rings = f.perimeter_rings
        const validPolygon =
          !circleMarkersOnly
          && Array.isArray(rings)
          && rings.length > 0
          && rings.every(r => Array.isArray(r) && r.length >= 3)
        if (validPolygon) {
          return (
            <Polygon
              key={f.id}
              positions={rings as [number, number][][]}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.4, weight: 2 }}
            >
              {popup}
            </Polygon>
          )
        }
        return (
          <CircleMarker
            key={f.id}
            center={[f.latitude, f.longitude]}
            radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
          >
            {popup}
          </CircleMarker>
        )
      })}
    </>
  )
}

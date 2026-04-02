'use client'

import { Fragment } from 'react'
import { Circle, Polygon, Popup } from 'react-leaflet'
import type { NifcFire, WindData } from '@/app/dashboard/caregiver/map/LeafletMap'
import { containmentColor, isActiveNifcFire } from '@/lib/nifc-fire-map'
import { estimatedRiskRadiusKm } from '@/lib/fire-risk-zone'
import { generateEllipse, vanWagnerLW } from '@/lib/fire-spread-ellipse'

const WIND_MIN_MPH = 4
/** Cap length-to-breadth so ellipses stay readable on hub zoom levels */
const LW_CAP = 4

/**
 * Dashed “modeled concern” halos around NIFC incidents + optional wind-elongated ellipse (downwind).
 * Renders below solid fire layers. Not an official evacuation line.
 */
export default function NifcFirePredictionOverlay({
  nifc,
  windData = null,
}: {
  nifc: NifcFire[]
  windData?: WindData | null
}) {
  const active = nifc.filter(isActiveNifcFire)
  const useWind =
    windData != null
    && Number.isFinite(windData.speedMph)
    && windData.speedMph >= WIND_MIN_MPH
    && Number.isFinite(windData.spreadDeg)

  return (
    <>
      {active.map(f => {
        const color = containmentColor(f.containment)
        const rKm = estimatedRiskRadiusKm(f.acres)
        const rM = rKm * 1000

        const riskPopup = (
          <Popup>
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.6, maxWidth: 270 }}>
              <strong style={{ color: '#0f172a' }}>Modeled risk halo — {f.fire_name}</strong>
              <p style={{ margin: '6px 0 0', color: '#475569' }}>
                Sized from reported acres (buffered). <strong>Not</strong> an official evacuation zone — pair with
                ICS / NIFC and local directives.
              </p>
            </div>
          </Popup>
        )

        if (useWind && windData) {
          const LW = Math.min(vanWagnerLW(windData.speedMph), LW_CAP)
          const e = Math.sqrt(Math.max(0, 1 - 1 / (LW * LW)))
          const b_m = rM / Math.sqrt(LW)
          const a_m = b_m * LW
          const c_m = a_m * e
          const headDir = ((windData.spreadDeg % 360) + 360) % 360
          const pts = generateEllipse(f.latitude, f.longitude, a_m, b_m, c_m, headDir)
          const mph = Math.round(windData.speedMph)

          const windPopup = (
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.6, maxWidth: 270 }}>
                <strong style={{ color: '#0f172a' }}>Wind-oriented emphasis</strong>
                <p style={{ margin: '6px 0 0', color: '#475569' }}>
                  Elongation points <strong>downwind</strong> using ~{mph} mph wind and a standard length-to-breadth
                  model. Illustrative spread indicator only.
                </p>
              </div>
            </Popup>
          )

          return (
            <Fragment key={`pred-${f.id}`}>
              <Circle
                center={[f.latitude, f.longitude]}
                radius={rM}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.06,
                  weight: 1.5,
                  dashArray: '8 6',
                }}
              >
                {riskPopup}
              </Circle>
              <Polygon
                positions={pts}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.09,
                  weight: 1.5,
                  dashArray: '4 6',
                }}
              >
                {windPopup}
              </Polygon>
            </Fragment>
          )
        }

        return (
          <Circle
            key={`pred-${f.id}`}
            center={[f.latitude, f.longitude]}
            radius={rM}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '8 6',
            }}
          >
            {riskPopup}
          </Circle>
        )
      })}
    </>
  )
}

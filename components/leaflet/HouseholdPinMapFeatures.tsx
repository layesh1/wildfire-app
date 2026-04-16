'use client'

import { Fragment, useCallback, useMemo, useState } from 'react'
import { Marker, Popup, Tooltip } from 'react-leaflet'
import type { HouseholdMember, HouseholdPin } from '@/lib/responder-household'
import {
  isHomeEvacuationStatus,
  labelForHomeEvacuationStatus,
  type HomeEvacuationStatus,
} from '@/lib/checkin-status'
import {
  createResponderEvacueeDivIconTint,
  type ResponderEvacMarkerTint,
} from '@/components/leaflet/responderEvacueeMarkerIcon'
import type { NifcFire } from '@/app/dashboard/caregiver/map/LeafletMap'
import { isWithinActiveFireProximity } from '@/lib/nifc-fire-proximity'

const HOME_STATUS_COLOR: Record<HomeEvacuationStatus, string> = {
  not_evacuated: '#6b7280',
  evacuated: '#22c55e',
  cannot_evacuate: '#ef4444',
}

function statusOf(m: HouseholdMember): HomeEvacuationStatus {
  return isHomeEvacuationStatus(m.home_evacuation_status) ? m.home_evacuation_status : 'not_evacuated'
}

function mobilityEmojiTag(s: string): string {
  const x = s.toLowerCase()
  if (x.includes('wheelchair') || x.includes('mobility device')) return `🦽 ${s}`
  if (x.includes('bedridden') || x.includes('limited mobility')) return `🛏️ ${s}`
  if (x.includes('walk') || x.includes('distance') || x.includes('assistance')) return `🚶 ${s}`
  return s
}

function medicalEmojiTag(s: string): string {
  const x = s.toLowerCase()
  if (x.includes('oxygen') || x.includes('ventilator')) return `🫁 ${s}`
  if (x.includes('dialysis')) return `🫘 ${s}`
  return s
}

function memberHomeLabel(s: string): string {
  const h = isHomeEvacuationStatus(s) ? s : 'not_evacuated'
  return labelForHomeEvacuationStatus(h)
}

function HouseholdPopupBody({
  pin,
  onUpdated,
}: {
  pin: HouseholdPin
  onUpdated?: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const patch = useCallback(
    async (userId: string, status: HomeEvacuationStatus) => {
      setBusy(userId)
      setErr(null)
      try {
        const res = await fetch('/api/responder/update-status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, status }),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) throw new Error(j.error || res.statusText)
        onUpdated?.()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Update failed')
      } finally {
        setBusy(null)
      }
    },
    [onUpdated]
  )

  const urgent = pin.members.filter(m => m.home_evacuation_status === 'cannot_evacuate')

  return (
    <div style={{ minWidth: 260, maxWidth: 320, fontFamily: 'sans-serif', fontSize: 12 }}>
      {pin.is_demo && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: '#78716c',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          DEMO
        </div>
      )}
      {urgent.map(m => (
        <div
          key={m.id}
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontWeight: 700,
            fontSize: 11,
            padding: '8px 10px',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          ⚠️ PRIORITY — {m.name} cannot evacuate
        </div>
      ))}
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{pin.address}</div>
      <div style={{ color: '#475569', marginBottom: 12, fontSize: 11 }}>
        {pin.evacuated} of {pin.total_people} people evacuated
      </div>
      {err && <div style={{ color: '#b91c1c', fontSize: 11, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pin.members.map(m => {
          const st = statusOf(m)
          const fill = HOME_STATUS_COLOR[st]
          const label = memberHomeLabel(m.home_evacuation_status)
          const icon = st === 'evacuated' ? '✓' : st === 'cannot_evacuate' ? '⚠' : '🏠'
          return (
            <div key={m.id} style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 2 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{m.name}</div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 10px',
                  borderRadius: 10,
                  background: fill + '22',
                  color: fill,
                  fontWeight: 600,
                  fontSize: 11,
                  marginBottom: 6,
                }}
              >
                <span aria-hidden>{icon}</span>
                {label}
              </div>
              {(m.mobility_needs.length > 0 || m.medical_needs.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {m.mobility_needs.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 8,
                        background: '#f1f5f9',
                        color: '#334155',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {mobilityEmojiTag(tag)}
                    </span>
                  ))}
                  {m.medical_needs.map(tag => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 8,
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: 9,
                        fontWeight: 600,
                      }}
                    >
                      {medicalEmojiTag(tag)}
                    </span>
                  ))}
                </div>
              )}
              {(m.disability_other || m.medical_other) && (
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, lineHeight: 1.35 }}>
                  {m.disability_other && <div>{m.disability_other}</div>}
                  {m.medical_other && <div>{m.medical_other}</div>}
                </div>
              )}
              {m.work_address?.trim() && (
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Work: {m.work_address}</div>
              )}
              {m.phone && (
                <div style={{ fontSize: 11, color: '#334155', marginBottom: 8 }}>📞 {m.phone}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => patch(m.id, 'evacuated')}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #86efac',
                    background: '#f0fdf4',
                    color: '#166534',
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  ✓ Evacuated — I left
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => patch(m.id, 'cannot_evacuate')}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  ✓ Cannot evacuate
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function homeMarkerTint(
  pin: HouseholdPin,
  proximityFires: NifcFire[] | undefined,
  proximityMiles: number | undefined,
): ResponderEvacMarkerTint {
  const fireNearby =
    proximityFires != null
    && proximityMiles != null
    && isWithinActiveFireProximity(pin.lat, pin.lng, proximityFires, proximityMiles)
  if (proximityFires != null && proximityMiles != null && !fireNearby) return 'neutral'
  const homeOk = pin.total_people > 0 && pin.members.every(m => statusOf(m) === 'evacuated')
  return homeOk ? 'cleared' : 'needs_action'
}

function officeMarkerTint(
  pin: HouseholdPin,
  site: NonNullable<HouseholdPin['officeSites']>[number],
  proximityFires: NifcFire[] | undefined,
  proximityMiles: number | undefined,
): ResponderEvacMarkerTint {
  const fireNearby =
    proximityFires != null
    && proximityMiles != null
    && isWithinActiveFireProximity(site.lat, site.lng, proximityFires, proximityMiles)
  if (proximityFires != null && proximityMiles != null && !fireNearby) return 'neutral'
  const w = site.address.trim()
  const subset = pin.members.filter(m => (m.work_address?.trim() || '') === w)
  const workOk = subset.length > 0 && subset.every(m => statusOf(m) === 'evacuated')
  return workOk ? 'cleared' : 'needs_action'
}

function OfficeEvacMarker({
  pin,
  site,
  onUpdated,
  proximityFires,
  proximityMiles,
}: {
  pin: HouseholdPin
  site: NonNullable<HouseholdPin['officeSites']>[number]
  onUpdated?: () => void
  proximityFires?: NifcFire[]
  proximityMiles?: number
}) {
  const tint = useMemo(
    () => officeMarkerTint(pin, site, proximityFires, proximityMiles),
    [pin, site, proximityFires, proximityMiles]
  )

  const icon = useMemo(() => createResponderEvacueeDivIconTint(tint, 'office'), [tint])

  return (
    <Marker position={[site.lat, site.lng]} icon={icon}>
      <Tooltip direction="top" opacity={0.95}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 11, maxWidth: 220 }}>
          <div style={{ fontWeight: 700 }}>Office / work</div>
          <div style={{ color: '#475569' }}>{site.address}</div>
        </div>
      </Tooltip>
      <Popup>
        <HouseholdPopupBody pin={pin} onUpdated={onUpdated} />
      </Popup>
    </Marker>
  )
}

function HouseholdHomeMarker({
  pin,
  onUpdated,
  proximityFires,
  proximityMiles,
}: {
  pin: HouseholdPin
  onUpdated?: () => void
  proximityFires?: NifcFire[]
  proximityMiles?: number
}) {
  const tint = useMemo(
    () => homeMarkerTint(pin, proximityFires, proximityMiles),
    [pin, proximityFires, proximityMiles]
  )
  const icon = useMemo(() => createResponderEvacueeDivIconTint(tint, 'home'), [tint])

  return (
    <Marker position={[pin.lat, pin.lng]} icon={icon}>
      <Tooltip direction="top" opacity={0.95}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 11, maxWidth: 240 }}>
          {pin.is_demo && (
            <div style={{ fontSize: 9, fontWeight: 800, color: '#a8a29e', letterSpacing: '0.06em', marginBottom: 4 }}>
              DEMO
            </div>
          )}
          <div style={{ fontWeight: 700 }}>Home</div>
          <div style={{ color: '#475569' }}>{pin.address}</div>
        </div>
      </Tooltip>
      <Popup>
        <HouseholdPopupBody pin={pin} onUpdated={onUpdated} />
      </Popup>
    </Marker>
  )
}

export default function HouseholdPinMapFeatures({
  householdPins,
  onUpdated,
  /** When set with `proximityFires`, home/office rings are grey outside this radius (mi) of any active incident. */
  proximityMiles,
  proximityFires,
}: {
  householdPins: HouseholdPin[]
  onUpdated?: () => void
  proximityMiles?: number
  proximityFires?: NifcFire[]
}) {
  if (householdPins.length === 0) return null

  return (
    <>
      {householdPins.map(pin => (
        <Fragment key={pin.id}>
          <HouseholdHomeMarker
            pin={pin}
            onUpdated={onUpdated}
            proximityFires={proximityFires}
            proximityMiles={proximityMiles}
          />
          {(pin.officeSites ?? []).map(site => (
            <OfficeEvacMarker
              key={`${pin.id}-${site.key}`}
              pin={pin}
              site={site}
              onUpdated={onUpdated}
              proximityFires={proximityFires}
              proximityMiles={proximityMiles}
            />
          ))}
        </Fragment>
      ))}
    </>
  )
}

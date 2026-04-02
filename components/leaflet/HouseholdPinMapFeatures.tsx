'use client'

import { useCallback, useState } from 'react'
import { CircleMarker, Popup, Tooltip } from 'react-leaflet'
import type { HouseholdPin } from '@/lib/responder-household'
import {
  isHomeEvacuationStatus,
  labelForHomeEvacuationStatus,
  type HomeEvacuationStatus,
} from '@/lib/checkin-status'

const PRIORITY_COLOR: Record<HouseholdPin['priority'], string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MONITOR: '#eab308',
  CLEAR: '#22c55e',
}

const HOME_STATUS_COLOR: Record<HomeEvacuationStatus, string> = {
  not_evacuated: '#6b7280',
  evacuated: '#22c55e',
  cannot_evacuate: '#ef4444',
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
          const st = isHomeEvacuationStatus(m.home_evacuation_status)
            ? m.home_evacuation_status
            : 'not_evacuated'
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
                  ✓ Checked — Evacuated
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
                  ✓ Checked — Needs EMS
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function HouseholdPinMapFeatures({
  householdPins,
  onUpdated,
}: {
  householdPins: HouseholdPin[]
  onUpdated?: () => void
}) {
  if (householdPins.length === 0) return null

  return (
    <>
      {householdPins.map(pin => {
        const fill = PRIORITY_COLOR[pin.priority]
        const pathClass = pin.priority === 'CRITICAL' ? 'wf-household-critical' : ''
        const label =
          pin.total_people === 1
            ? (() => {
                const m = pin.members[0]
                if (!m) return '·'
                const st = isHomeEvacuationStatus(m.home_evacuation_status)
                  ? m.home_evacuation_status
                  : 'not_evacuated'
                return st === 'evacuated' ? '✓' : st === 'cannot_evacuate' ? '⚠' : '🏠'
              })()
            : `${pin.evacuated}/${pin.total_people}`

        return (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={12}
            pathOptions={{
              className: pathClass,
              color: fill,
              fillColor: fill,
              fillOpacity: 0.88,
              weight: 2,
            }}
          >
            <Tooltip direction="center" permanent opacity={1}>
              <span
                style={{
                  fontFamily: 'sans-serif',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#0f172a',
                  textShadow: '0 0 2px #fff, 0 0 4px #fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {pin.is_demo && (
                  <span style={{ fontSize: 7, fontWeight: 800, color: '#a8a29e', letterSpacing: '0.08em' }}>
                    DEMO
                  </span>
                )}
                <span>{label}</span>
              </span>
            </Tooltip>
            <Popup>
              <HouseholdPopupBody pin={pin} onUpdated={onUpdated} />
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

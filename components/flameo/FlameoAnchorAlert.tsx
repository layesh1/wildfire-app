'use client'

import { useState } from 'react'
import type { FlameoContext, FlameoContextStatus } from '@/lib/flameo-context-types'
import type { DetectedAnchor } from '@/hooks/useUserLocation'

function hasWheelchairMobility(mobilityNeeds: string[] | null | undefined): boolean {
  const mn = mobilityNeeds ?? []
  return mn.some(s => /wheelchair|mobility device|walker|cane/i.test(String(s)))
}

export default function FlameoAnchorAlert({
  status,
  context,
  detectedAnchor,
  workBuildingType,
  workFloorFromProfile,
  mobilityNeeds,
  onSaveFloor,
}: {
  status: FlameoContextStatus | null
  context: FlameoContext | null
  detectedAnchor: DetectedAnchor
  workBuildingType: string | null | undefined
  workFloorFromProfile: number | null | undefined
  mobilityNeeds: string[] | null | undefined
  onSaveFloor: (floor: number) => Promise<void>
}) {
  const [floorInput, setFloorInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmedFloor, setConfirmedFloor] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const threat =
    status === 'ready' && context?.flags?.has_confirmed_threat === true
  const multi =
    workBuildingType === 'office' || workBuildingType === 'apartment'
  const active = threat && detectedAnchor === 'work' && multi

  const floorSaved =
    workFloorFromProfile != null && Number.isFinite(Number(workFloorFromProfile))
  const floorForCopy = confirmedFloor ?? (floorSaved ? Number(workFloorFromProfile) : null)

  const wheelchair = hasWheelchairMobility(mobilityNeeds)

  if (!active) return null

  if (floorSaved && confirmedFloor == null) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-slate-900">
        <div className="flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flameo1.png" alt="" width={36} height={36} className="shrink-0 rounded-lg" />
          <p className="text-[12px] leading-snug">
            Fire detected near your office. You&apos;re on floor{' '}
            <strong>{workFloorFromProfile}</strong>. Do not use elevators — use the nearest stairwell to evacuate.
          </p>
        </div>
      </div>
    )
  }

  if (confirmedFloor != null && floorForCopy != null) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-slate-900">
        <div className="flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flameo1.png" alt="" width={36} height={36} className="shrink-0 rounded-lg" />
          <p className="text-[12px] leading-snug">
            {wheelchair ? (
              <>
                You&apos;re on floor <strong>{floorForCopy}</strong> and use a mobility device. Do not use elevators.
                Contact building security immediately for stair-assisted evacuation help.
              </>
            ) : (
              <>
                You&apos;re on floor <strong>{floorForCopy}</strong>. Do not use elevators during a fire. Locate your
                nearest stairwell and exit the building.
              </>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-amber-400/80 bg-gradient-to-br from-white to-amber-50 p-3 text-slate-900 shadow-sm">
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flameo1.png"
          alt=""
          width={40}
          height={40}
          className="shrink-0 rounded-lg border border-amber-200 bg-white object-contain"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">Flameo</p>
          <p className="text-[12px] leading-snug">
            There&apos;s a fire near your work location. What floor are you on right now?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              max={200}
              value={floorInput}
              onChange={e => setFloorInput(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
              placeholder="Floor #"
              className="w-24 rounded-lg border border-amber-200 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const n = parseInt(floorInput, 10)
                if (!Number.isFinite(n) || n < 1 || n > 200) {
                  setErr('Enter a floor between 1 and 200.')
                  return
                }
                setErr(null)
                setSaving(true)
                try {
                  await onSaveFloor(n)
                  setConfirmedFloor(n)
                  try {
                    window.dispatchEvent(new CustomEvent('wfa-flameo-context-refresh'))
                  } catch {
                    /* ignore */
                  }
                } catch (e) {
                  setErr(e instanceof Error ? e.message : 'Could not save')
                } finally {
                  setSaving(false)
                }
              }}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
          {err && <p className="text-[11px] text-red-600">{err}</p>}
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import type { FlameoShelterRouteRanked } from '@/lib/flameo-context-types'

type Props = {
  shelters: FlameoShelterRouteRanked[]
  userLat: number
  userLng: number
  mapHref: string
  wheelchairMode?: boolean
  /** ISO timestamp from GET /api/flameo/context → shelters_meta.last_checked_at */
  shelterDataCheckedAt?: string
  shelterCacheAgeSeconds?: number
}

function mapsDirectionLink(userLat: number, userLng: number, s: FlameoShelterRouteRanked): string {
  return (
    'https://www.google.com/maps/dir/?api=1'
    + `&origin=${encodeURIComponent(`${userLat},${userLng}`)}`
    + `&destination=${encodeURIComponent(`${s.lat},${s.lon}`)}`
    + '&travelmode=driving'
  )
}

function minutesSinceIso(iso: string | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 60_000))
}

export default function ShelterRouteCard({
  shelters,
  userLat,
  userLng,
  mapHref,
  wheelchairMode = false,
  shelterDataCheckedAt,
  shelterCacheAgeSeconds = 0,
}: Props) {
  const top = shelters.slice(0, 2)
  if (!top.length) return null

  const checkedMins =
    minutesSinceIso(shelterDataCheckedAt) ?? Math.floor(shelterCacheAgeSeconds / 60)
  const stale = checkedMins > 30

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm shrink-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Shelter routes</div>
      <p className="mt-1 text-[10px] text-emerald-900/80">
        Shelter data: Last checked {checkedMins} min ago
        {stale && (
          <span className="ml-1 font-semibold text-amber-800"> · Data may be outdated</span>
        )}
      </p>
      <div className="mt-2 space-y-2">
        {top.map((s, idx) => {
          const verifiedOpen = s.verified === true && s.source === 'fema_nss'
          const minsVerified = minutesSinceIso(s.last_verified_at ?? undefined)
          return (
            <div key={`${s.name}-${idx}`} className="rounded-lg border border-emerald-100 bg-white p-2.5">
              <div className="text-xs font-semibold text-slate-900">{s.name}</div>
              {verifiedOpen ? (
                <div className="mt-1 text-[10px] font-semibold text-green-800">
                  Open — verified
                  {minsVerified != null ? ` ${minsVerified} min ago` : ''}
                  {s.capacity != null && s.capacity > 0 && (
                    <span className="font-normal text-slate-700">
                      {' '}
                      · {s.current_occupancy ?? '—'} of {s.capacity} capacity
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1 space-y-0.5">
                  <div className="text-[10px] font-semibold text-slate-600">Pre-identified location</div>
                  <p className="text-[10px] leading-snug text-slate-600">
                    Call ahead to confirm this site is open before traveling.
                  </p>
                </div>
              )}
              {!s.verified && (
                <p className="mt-1 text-[10px] font-medium text-amber-800">
                  Route calculated to a pre-identified location — confirm shelter is open before traveling.
                </p>
              )}
              <div className="mt-0.5 text-[11px] text-slate-700">
                {s.distance_miles} mi · {s.travel_minutes} min
              </div>
              <div className={`mt-1 text-[10px] font-medium ${s.route_avoids_fire ? 'text-emerald-700' : 'text-amber-700'}`}>
                {s.route_avoids_fire ? 'Route clear of fire zone' : 'Route passes near fire — use caution'}
              </div>
              {wheelchairMode && (
                <div className="mt-1 text-[10px] text-slate-700">
                  Call ahead{s.phone ? `: ${s.phone}` : ''} to confirm wheelchair accessible entry.
                </div>
              )}
              <a
                href={mapsDirectionLink(userLat, userLng, s)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600"
              >
                Get Directions
              </a>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-emerald-900/85">
        Shelter status can change rapidly during an active emergency. Always confirm before traveling.
      </p>
      <Link href={mapHref} className="mt-1 inline-flex text-[10px] font-semibold text-emerald-800 hover:text-emerald-900">
        See all shelters
      </Link>
    </div>
  )
}

'use client'

import Link from 'next/link'
import type { FlameoShelterRouteRanked } from '@/lib/flameo-context-types'

type Props = {
  shelters: FlameoShelterRouteRanked[]
  userLat: number
  userLng: number
  mapHref: string
  wheelchairMode?: boolean
}

function mapsDirectionLink(userLat: number, userLng: number, s: FlameoShelterRouteRanked): string {
  return (
    'https://www.google.com/maps/dir/?api=1'
    + `&origin=${encodeURIComponent(`${userLat},${userLng}`)}`
    + `&destination=${encodeURIComponent(`${s.lat},${s.lon}`)}`
    + '&travelmode=driving'
  )
}

export default function ShelterRouteCard({
  shelters,
  userLat,
  userLng,
  mapHref,
  wheelchairMode = false,
}: Props) {
  const top = shelters.slice(0, 2)
  if (!top.length) return null
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm shrink-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Shelter routes</div>
      <div className="mt-2 space-y-2">
        {top.map((s, idx) => (
          <div key={`${s.name}-${idx}`} className="rounded-lg border border-emerald-100 bg-white p-2.5">
            <div className="text-xs font-semibold text-slate-900">{s.name}</div>
            <div className="mt-0.5 text-[11px] text-slate-700">
              {s.distance_miles} mi · {s.travel_minutes} min
            </div>
            <div className={`mt-1 text-[10px] font-medium ${s.route_avoids_fire ? 'text-emerald-700' : 'text-amber-700'}`}>
              {s.route_avoids_fire ? '✅ Route clear of fire zone' : '⚠️ Route passes near fire — use caution'}
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
        ))}
      </div>
      <Link href={mapHref} className="mt-2 inline-flex text-[10px] font-semibold text-emerald-800 hover:text-emerald-900">
        See all shelters
      </Link>
    </div>
  )
}

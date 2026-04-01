'use client'

import Link from 'next/link'
import type { FlameoContext, FlameoContextStatus } from '@/lib/flameo-context-types'
import { distanceMiles } from '@/lib/hub-map-distance'
import { FlameoFormattedText } from '@/components/flameo/FlameoFormattedText'

type Person = {
  id: string
  name: string
  address?: string
  home_evacuation_status?: string | null
  in_danger_zone?: boolean
}

type Props = {
  flameoContext: FlameoContext | null
  flameoStatus: FlameoContextStatus | null
  flameoBriefing: string | null
  flameoLoading: boolean
  flameoError: string | null
  userLat: number | null
  userLng: number | null
  detectedAnchor: 'home' | 'work' | 'unknown'
  myPeople: Person[]
  wheelchairMode: boolean
  onAskFlameo: () => void
}

function dangerBand(nearestMiles: number | null): 'danger' | 'monitor' | 'clear' {
  if (nearestMiles == null) return 'clear'
  if (nearestMiles < 2) return 'danger'
  if (nearestMiles <= 10) return 'monitor'
  return 'clear'
}

function statusIconLabel(status: string | null | undefined): { icon: string; label: string } {
  switch (status) {
    case 'evacuated':
      return { icon: '✅', label: 'Evacuated' }
    case 'under_warning':
      return { icon: '🟡', label: 'Under warning' }
    case 'under_order':
      return { icon: '🔴', label: 'Under order' }
    case 'sheltering':
      return { icon: '🏠', label: 'Sheltering' }
    case 'safe':
      return { icon: '✅', label: 'Safe' }
    case 'needs_help':
      return { icon: '⚠️', label: 'Needs help' }
    case 'unknown':
    default:
      return { icon: '⚪', label: 'Unknown' }
  }
}

function hazardTypeLabel(type: 'nuclear' | 'chemical' | 'lng_energy'): string {
  if (type === 'nuclear') return 'Nuclear facility'
  if (type === 'chemical') return 'Chemical plant'
  return 'Gas/Energy facility'
}

const panel =
  'rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900'
const sectionHead =
  'text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'

export default function FlameoSituationRoom({
  flameoContext,
  flameoStatus,
  flameoBriefing,
  flameoLoading,
  flameoError,
  userLat,
  userLng,
  detectedAnchor,
  myPeople,
  wheelchairMode,
  onAskFlameo,
}: Props) {
  const status = flameoStatus
  const incidents = flameoContext?.incidents_nearby ?? []
  const anchors = flameoContext?.anchors ?? []
  const shelters = flameoContext?.shelters_ranked ?? []
  const hazards = flameoContext?.hazard_sites_nearby ?? []
  const nearestIncident = incidents[0] ?? null
  const nearestIncidentMiles = nearestIncident?.distance_miles ?? null

  const anchorRows = anchors.map(anchor => {
    const nearest = incidents.length
      ? Math.min(
          ...incidents.map(i => distanceMiles([anchor.lat, anchor.lon], [i.lat, i.lon]))
        )
      : null
    return { anchor, nearestMiles: nearest }
  })
  const topShelter = shelters[0] ?? null
  const readyLike = status === 'ready' || status === 'feeds_partial'
  const hasThreat = flameoContext?.flags?.has_confirmed_threat === true
  const shouldShowRoute = readyLike && hasThreat && shelters.length > 0

  const topHazardName = hazards[0]?.name ?? 'a nearby hazard site'

  function renderActiveSituation() {
    if (flameoLoading) {
      return (
        <div className="mt-2 space-y-2" aria-busy="true" aria-label="Loading situation">
          <div className="h-4 w-3/4 max-w-[280px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-full max-w-[320px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-2/3 max-w-[200px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      )
    }
    if (flameoError) {
      return (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {flameoError}
        </p>
      )
    }
    if (status === 'address_missing') {
      return (
        <div className="mt-2 text-sm text-gray-800 dark:text-gray-100">
          <p>Add your home address in Settings to get personalized fire alerts.</p>
          <Link
            href="/dashboard/settings"
            className="mt-2 inline-flex text-sm font-semibold text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
          >
            Go to Settings →
          </Link>
        </div>
      )
    }
    if (status === 'geocode_failed') {
      return (
        <div className="mt-2 text-sm text-gray-800 dark:text-gray-100">
          <p>We couldn&apos;t place your address on the map. Check spelling in Settings.</p>
          <Link
            href="/dashboard/settings"
            className="mt-2 inline-flex text-sm font-semibold text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
          >
            Review address →
          </Link>
        </div>
      )
    }
    if (status === 'feeds_unavailable') {
      return (
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
          Fire activity feeds are temporarily unavailable. Try again in a few minutes.
        </p>
      )
    }
    if (readyLike && hasThreat) {
      return (
        <div className="mt-2 space-y-1 text-sm text-gray-900 dark:text-gray-100">
          <div>
            🔥 {nearestIncident?.name || 'Active threat'} — {nearestIncidentMiles != null ? `${nearestIncidentMiles.toFixed(1)} mi` : '—'} away
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Wind: {flameoContext?.weather_summary?.wind_mph ?? '—'} mph {flameoContext?.weather_summary?.wind_dir ?? '—'}
            </span>
            {typeof flameoContext?.weather_summary?.wind_dir_deg === 'number' && (
              <span
                className="inline-block text-gray-900 dark:text-gray-100"
                style={{ transform: `rotate(${(flameoContext.weather_summary.wind_dir_deg + 180) % 360}deg)` }}
              >
                ↑
              </span>
            )}
          </div>
          <div>Fire risk: {flameoContext?.weather_summary?.fire_risk ?? 'Unknown'}</div>
          {flameoBriefing && (
            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              <FlameoFormattedText text={flameoBriefing} />
            </p>
          )}
          {status === 'feeds_partial' && (
            <p className="text-xs text-amber-800 dark:text-amber-200">Some data sources reported errors; showing the best available picture.</p>
          )}
        </div>
      )
    }
    if (readyLike && !hasThreat) {
      return (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-emerald-800 dark:text-emerald-300">✅ No active fire threats near your locations</p>
          {status === 'feeds_partial' && (
            <p className="text-xs text-amber-800 dark:text-amber-200">Limited feed coverage — no nearby threats in available data.</p>
          )}
        </div>
      )
    }
    if (status === 'no_fires_in_radius') {
      return (
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
          ✅ No active fires within {flameoContext?.alert_radius_miles ?? '—'} miles
        </p>
      )
    }
    if (status == null) {
      return (
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Situation data isn&apos;t available yet. Refresh or try again shortly.
        </p>
      )
    }
    return (
      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        Updating situation… If this persists, open the map or check your connection.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className={panel}>
        <div className={sectionHead}>Active Situation</div>
        {renderActiveSituation()}
      </div>

      {anchorRows.length > 0 && (
        <div className={panel}>
          <div className={sectionHead}>Your Locations</div>
          <div className="mt-2 space-y-2">
            {anchorRows.map(({ anchor, nearestMiles }) => {
              const band = dangerBand(nearestMiles)
              return (
                <div
                  key={anchor.id}
                  className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm dark:border-gray-600"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{anchor.label}</div>
                  <div className="mt-0.5 text-gray-700 dark:text-gray-300">
                    {band === 'danger' ? '🔴 IN DANGER ZONE' : band === 'monitor' ? '🟡 MONITOR' : '🟢 Clear'}
                  </div>
                </div>
              )
            })}
          </div>
          {detectedAnchor === 'work' && anchorRows.some(a => a.anchor.id === 'home' && dangerBand(a.nearestMiles) !== 'clear') && (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
              <p>⚠️ Fire detected near your home address. Is anyone there? Let your family know.</p>
              <Link href="/dashboard/home/people" className="mt-1 inline-flex font-semibold hover:underline">
                Notify My People →
              </Link>
            </div>
          )}
        </div>
      )}

      {shouldShowRoute && topShelter && (
        <div className={panel}>
          <div className={sectionHead}>Recommended Route</div>
          <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{topShelter.name}</div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {topShelter.travel_minutes} min · {topShelter.distance_miles} mi
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">via {topShelter.route_summary}</div>
          <div className="mt-2 text-sm">
            {!topShelter.route_avoids_fire && (
              <span className="text-amber-800 dark:text-amber-200">⚠️ Route passes near fire — use caution</span>
            )}
            {topShelter.route_avoids_fire && topShelter.passes_near_hazard === true && (
              <span className="text-amber-800 dark:text-amber-200">⚠️ Route passes near hazard site</span>
            )}
            {topShelter.route_avoids_fire && topShelter.passes_near_hazard !== true && (
              <span className="text-emerald-800 dark:text-emerald-300">✅ Route avoids fire and hazard sites</span>
            )}
          </div>
          {userLat != null && userLng != null && (
            <a
              href={
                'https://www.google.com/maps/dir/?api=1'
                + `&origin=${encodeURIComponent(`${userLat},${userLng}`)}`
                + `&destination=${encodeURIComponent(`${topShelter.lat},${topShelter.lon}`)}`
                + '&travelmode=driving'
              }
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-sm font-semibold text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
            >
              Get Directions →
            </a>
          )}
          <div>
            <Link
              href="/dashboard/home/map"
              className="mt-1 inline-flex text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              See all shelters →
            </Link>
          </div>
        </div>
      )}

      {shelters.length > 0 && hazards.length > 0 && (
        <div className={panel}>
          <div className={sectionHead}>Route Avoids</div>
          {topShelter?.passes_near_hazard ? (
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
              ⚠️ Best available route passes near {topHazardName}. Proceed with caution.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                ROUTE STEERS CLEAR OF:
              </div>
              {hazards.slice(0, 3).map(h => (
                <div key={h.id} className="text-sm text-gray-800 dark:text-gray-200">
                  ⚠️ {h.name} — {h.distance_miles} mi
                  <span className="ml-1 text-gray-500 dark:text-gray-400">({hazardTypeLabel(h.type)})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {myPeople.length > 0 && (
        <div className={panel}>
          <div className={sectionHead}>My People</div>
          <div className="mt-2 space-y-1.5">
            {myPeople.slice(0, 3).map(p => {
              const s = statusIconLabel(p.home_evacuation_status)
              return (
                <div
                  key={p.id}
                  className="rounded-md border border-gray-200 px-2.5 py-2 text-sm dark:border-gray-600"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {s.icon} {s.label}
                  </div>
                  {p.in_danger_zone && (
                    <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-200">
                      ⚠️ In danger zone
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <Link
            href="/dashboard/home/people"
            className="mt-2 inline-flex text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            See all →
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={onAskFlameo}
        className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-left text-base font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
      >
        🔥 Ask Flameo anything →
      </button>

      {wheelchairMode && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Accessibility mode is on. Shelter recommendations prioritize mobility support.
        </p>
      )}
    </div>
  )
}

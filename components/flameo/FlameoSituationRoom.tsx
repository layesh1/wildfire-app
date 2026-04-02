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
  /** Household: "My People"; responder: e.g. "Zone evacuees (opt-in)". */
  peopleSectionTitle?: string
  notifyFamilyHref?: string
  sheltersMapHref?: string
  peopleDirectoryHref?: string
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

function minutesSinceIso(iso: string | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 60_000))
}

const panel =
  'rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800'
const sectionHead =
  'text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'

/** Brown hero card — matches hub “My alerts” accent; Flameo situation only */
const flameoActivePanel =
  'rounded-xl border border-amber-900/35 bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 p-3 shadow-md text-amber-50 dark:border-amber-800/50'
const flameoActiveHead =
  'text-[10px] font-bold uppercase tracking-wider text-amber-200/95'

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
  peopleSectionTitle = 'My People',
  notifyFamilyHref = '/dashboard/home/people',
  sheltersMapHref = '/dashboard/home/map',
  peopleDirectoryHref = '/dashboard/home/people',
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
  const shelterMeta = flameoContext?.shelters_meta
  const readyLike = status === 'ready' || status === 'feeds_partial'
  const hasThreat = flameoContext?.flags?.has_confirmed_threat === true
  /** Show fastest shelter + directions whenever we have ranked routes — not only when fire is in context (hazards still shape routing). */
  const shouldShowRoute =
    shelters.length > 0
    && status !== 'address_missing'
    && status !== 'geocode_failed'
    && (readyLike || status === 'no_fires_in_radius')
  const shelterCheckedMins =
    minutesSinceIso(shelterMeta?.last_checked_at)
    ?? Math.floor((shelterMeta?.cache_age_seconds ?? 0) / 60)
  const shelterDataStale = shelterCheckedMins > 30

  const topHazardName = hazards[0]?.name ?? 'a nearby hazard site'

  function renderActiveSituation() {
    if (flameoLoading) {
      return (
        <div className="mt-2 space-y-2" aria-busy="true" aria-label="Loading situation">
          <div className="h-4 w-3/4 max-w-[280px] animate-pulse rounded bg-amber-900/50" />
          <div className="h-4 w-full max-w-[320px] animate-pulse rounded bg-amber-900/50" />
          <div className="h-4 w-2/3 max-w-[200px] animate-pulse rounded bg-amber-900/50" />
        </div>
      )
    }
    if (flameoError) {
      return (
        <p className="mt-2 text-sm text-amber-200" role="alert">
          Unable to load fire data. Refresh to try again.
        </p>
      )
    }
    if (status === 'address_missing') {
      return (
        <div className="mt-2 text-sm text-amber-50/95">
          <p>Add your home address in Settings to get personalized fire alerts.</p>
          <Link
            href="/dashboard/settings"
            className="mt-2 inline-flex text-sm font-semibold text-amber-200 underline-offset-2 hover:text-white"
          >
            Go to Settings →
          </Link>
        </div>
      )
    }
    if (status === 'geocode_failed') {
      return (
        <div className="mt-2 text-sm text-amber-50/95">
          <p>We couldn&apos;t place your address on the map. Check spelling in Settings.</p>
          <Link
            href="/dashboard/settings"
            className="mt-2 inline-flex text-sm font-semibold text-amber-200 underline-offset-2 hover:text-white"
          >
            Review address →
          </Link>
        </div>
      )
    }
    if (status === 'feeds_unavailable') {
      return (
        <p className="mt-2 text-sm text-amber-200">
          Fire data temporarily unavailable. Your alerts will resume automatically.
        </p>
      )
    }
    if (readyLike && hasThreat) {
      const threatLabel = nearestIncident?.name?.trim() || 'Mapped wildfire (NIFC)'
      return (
        <div className="mt-2 space-y-1 text-sm text-amber-50/95">
          <div className="font-semibold text-white">
            🔥 {threatLabel} — {nearestIncidentMiles != null ? `${nearestIncidentMiles.toFixed(1)} mi` : '—'} away
          </div>
          <div className="flex flex-wrap items-center gap-2 text-amber-100/90">
            <span>
              Wind: {flameoContext?.weather_summary?.wind_mph ?? '—'} mph {flameoContext?.weather_summary?.wind_dir ?? '—'}
            </span>
            {typeof flameoContext?.weather_summary?.wind_dir_deg === 'number' && (
              <span
                className="inline-block text-amber-50"
                style={{ transform: `rotate(${(flameoContext.weather_summary.wind_dir_deg + 180) % 360}deg)` }}
              >
                ↑
              </span>
            )}
          </div>
          <div className="text-amber-100/90">Fire risk: {flameoContext?.weather_summary?.fire_risk ?? 'Unknown'}</div>
          {flameoBriefing && (
            <p className="text-xs text-amber-100/85 whitespace-pre-wrap leading-relaxed">
              <FlameoFormattedText text={flameoBriefing} />
            </p>
          )}
          {status === 'feeds_partial' && (
            <p className="text-xs text-amber-200/90">Some data sources reported errors; showing the best available picture.</p>
          )}
        </div>
      )
    }
    if (readyLike && !hasThreat) {
      return (
        <div className="mt-2 space-y-1">
          <p className="text-sm font-medium text-green-300">✅ No NIFC wildfires within your alert radius</p>
          {status === 'feeds_partial' && (
            <p className="text-xs text-amber-200/90">Limited feed coverage — no nearby threats in available data.</p>
          )}
        </div>
      )
    }
    if (status === 'no_fires_in_radius') {
      return (
        <p className="text-sm font-medium text-green-300">
          ✅ No mapped wildfires within {flameoContext?.alert_radius_miles ?? '—'} miles (federal incident data)
        </p>
      )
    }
    if (status == null) {
      return (
        <p className="mt-2 text-sm text-amber-100/90">
          Situation data isn&apos;t available yet. Refresh or try again shortly.
        </p>
      )
    }
    return (
      <p className="mt-2 text-sm text-amber-100/90">
        Updating situation… If this persists, open the map or check your connection.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className={flameoActivePanel}>
        <div className={flameoActiveHead}>Flameo · Active situation</div>
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
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{anchor.label}</div>
                  <div
                    className={
                      band === 'danger'
                        ? 'mt-0.5 text-sm text-red-700 dark:text-red-400'
                        : band === 'monitor'
                          ? 'mt-0.5 text-sm text-amber-700 dark:text-amber-400'
                          : 'mt-0.5 text-sm text-green-700 dark:text-green-400'
                    }
                  >
                    {band === 'danger' ? '🔴 IN DANGER ZONE' : band === 'monitor' ? '🟡 MONITOR' : '🟢 Clear'}
                  </div>
                </div>
              )
            })}
          </div>
          {detectedAnchor === 'work' && anchorRows.some(a => a.anchor.id === 'home' && dangerBand(a.nearestMiles) !== 'clear') && (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
              <p>⚠️ Fire detected near your home address. Is anyone there? Let your family know.</p>
              <Link href={notifyFamilyHref} className="mt-1 inline-flex font-semibold hover:underline">
                Notify My People →
              </Link>
            </div>
          )}
        </div>
      )}

      {shouldShowRoute && topShelter && (
        <div className={panel}>
          <div className={sectionHead}>Shelters &amp; recommended route</div>
          <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
            Shelter data: Last checked {shelterCheckedMins} min ago
            {shelterDataStale && (
              <span className="ml-1 font-semibold text-amber-700 dark:text-amber-400">· Data may be outdated</span>
            )}
          </p>
          {shelterMeta?.live_feed_ok === true && shelterMeta.fema_shelter_count === 0 && (
            <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
              <p>
                No confirmed open shelters in our live feed. Check your county emergency management website or dial{' '}
                <strong>2-1-1</strong> (community info line) for verified shelter locations.
              </p>
              <a
                href="https://www.fema.gov/emergency-managers/nims/emergency-operations-centers"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex font-semibold text-sky-800 underline-offset-2 hover:underline dark:text-sky-300"
              >
                Find your county emergency management →
              </a>
            </div>
          )}
          {shelterMeta?.live_feed_ok === false && (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
              Live shelter data unavailable. Contact your local emergency management or dial 2-1-1.
            </p>
          )}
          <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{topShelter.name}</div>
          {topShelter.verified && topShelter.source === 'fema_nss' ? (
            <div className="mt-1 text-xs font-semibold text-green-700 dark:text-green-400">
              Open — verified
              {(() => {
                const m = minutesSinceIso(topShelter.last_verified_at ?? undefined)
                return m != null ? ` ${m} min ago` : ''
              })()}
              {topShelter.capacity != null && topShelter.capacity > 0 && (
                <span className="font-normal text-gray-700 dark:text-gray-300">
                  {' '}
                  · {topShelter.current_occupancy ?? '—'} of {topShelter.capacity} capacity
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1 space-y-0.5">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">Pre-identified location</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Call ahead to confirm this shelter is open before traveling.
              </p>
            </div>
          )}
          {!topShelter.verified && (
            <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200">
              Route is to a pre-identified site — confirm it is open before you leave.
            </p>
          )}
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {topShelter.travel_minutes} min · {topShelter.distance_miles} mi
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">via {topShelter.route_summary}</div>
          <p className="mt-2 text-[11px] leading-snug text-gray-600 dark:text-gray-400">
            Shelter status can change rapidly during an active emergency. Always confirm before traveling.
          </p>
          <div className="mt-2 text-sm">
            {!topShelter.route_avoids_fire && (
              <span className="text-amber-700 dark:text-amber-400">⚠️ Route passes near fire — use caution</span>
            )}
            {topShelter.route_avoids_fire && topShelter.passes_near_hazard === true && (
              <span className="text-amber-700 dark:text-amber-400">⚠️ Route passes near hazard site</span>
            )}
            {topShelter.route_avoids_fire && topShelter.passes_near_hazard !== true && hasThreat && (
              <span className="text-green-700 dark:text-green-400">✅ Route avoids fire and hazard sites</span>
            )}
            {topShelter.route_avoids_fire && topShelter.passes_near_hazard !== true && !hasThreat && (
              <span className="text-green-700 dark:text-green-400">✅ Route avoids mapped hazard sites</span>
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
              href={sheltersMapHref}
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
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
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
          <div className={sectionHead}>{peopleSectionTitle}</div>
          <div className="mt-2 space-y-1.5">
            {myPeople.slice(0, 3).map(p => {
              const s = statusIconLabel(p.home_evacuation_status)
              return (
                <div
                  key={p.id}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {s.icon} {s.label}
                  </div>
                  {p.in_danger_zone && (
                    <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-400">
                      ⚠️ In danger zone
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <Link
            href={peopleDirectoryHref}
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

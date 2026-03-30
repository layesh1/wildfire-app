'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFlameoContext } from '@/hooks/useFlameoContext'
import { alertLevelFromFlameoContext } from '@/lib/hub-alert-level'
import AlertJar, { type AlertLevel } from '@/components/AlertJar'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle,
  Home,
  ArrowRight,
  HelpCircle,
  Clock,
  AlertTriangle,
  Map,
  Truck,
  Wind,
  ThermometerSun,
  Radio,
  Target,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { loadPersons } from '@/lib/user-data'
import {
  HOME_CHECKIN_STATUS_OPTIONS,
  PERSON_SAFETY_CHECKIN_STATUS_OPTIONS,
  mapLegacyCheckinToDual,
  isHomeEvacuationStatus,
  isPersonSafetyStatus,
  labelForHomeEvacuationStatus,
  type HomeEvacuationStatus,
  type PersonSafetyStatus,
} from '@/lib/checkin-status'
import type { FlameoContext } from '@/lib/flameo-context-types'

const HOME_ICONS: Record<HomeEvacuationStatus, typeof Home> = {
  not_evacuated: Home,
  evacuated: Truck,
  cannot_evacuate: AlertTriangle,
}

const HOME_ACTIVE: Record<HomeEvacuationStatus, string> = {
  not_evacuated: 'bg-ash-800/80 border-ash-600 text-ash-200',
  evacuated: 'bg-signal-safe/10 border-signal-safe/40 text-signal-safe',
  cannot_evacuate: 'bg-signal-danger/10 border-signal-danger/40 text-signal-danger',
}

const SAFETY_ICONS: Record<PersonSafetyStatus, typeof CheckCircle> = {
  safe: CheckCircle,
  at_shelter: Home,
  safe_elsewhere: ArrowRight,
  need_help: HelpCircle,
}

const SAFETY_ACTIVE: Record<PersonSafetyStatus, string> = {
  safe: 'bg-signal-safe/10 border-signal-safe/40 text-signal-safe',
  at_shelter: 'bg-signal-info/10 border-signal-info/40 text-signal-info',
  safe_elsewhere: 'bg-signal-warn/10 border-signal-warn/40 text-signal-warn',
  need_help: 'bg-signal-danger/10 border-signal-danger/40 text-signal-danger',
}

/** Uniform titles + descriptions (options in lib still carry emoji labels for stored display). */
const SAFETY_OPTION_COPY: Record<PersonSafetyStatus, { title: string; desc: string }> = {
  safe: { title: 'Safe', desc: 'You are safe and accounted for.' },
  at_shelter: { title: 'At a shelter', desc: 'At an evacuation shelter or official site.' },
  safe_elsewhere: { title: 'Safe elsewhere', desc: 'Safe but not at home — add a note if helpful.' },
  need_help: { title: 'Need help', desc: 'You need assistance or a wellness check.' },
}

const HOME_OPTION_TITLE: Record<HomeEvacuationStatus, string> = {
  not_evacuated: 'Home, not evacuated',
  evacuated: 'Evacuated — I left',
  cannot_evacuate: 'Cannot evacuate — need help',
}

type Subject = 'self' | string

function nearestIncidentMiles(ctx: FlameoContext | null): number | null {
  if (!ctx?.incidents_nearby?.length) return null
  return Math.min(...ctx.incidents_nearby.map(i => i.distance_miles))
}

function FlameoAutomatedAreaPanel({
  loading,
  error,
  context,
  status,
  message,
  level,
  variant,
}: {
  loading: boolean
  error: string | null
  context: FlameoContext | null
  status: string | null
  message?: string
  level: AlertLevel
  variant: 'desktop' | 'mobile'
}) {
  const isLight = variant === 'mobile'
  const border = isLight ? 'border-gray-200 bg-white' : 'border-ash-700 bg-ash-900/50'
  const subBorder = isLight ? 'border border-gray-200 bg-white shadow-sm' : 'border-ash-800/80 bg-black/20'
  const statText = isLight ? 'text-gray-800' : 'text-ash-400'
  const statStrong = isLight ? 'text-gray-950' : 'text-white'
  /** Orange accents read cleaner on light UI than yellow-gold. */
  const accent = isLight ? 'text-orange-800' : 'text-orange-400/95'
  const liveLocationTitle = isLight ? 'text-orange-950' : 'text-orange-400/95'

  if (loading) {
    return (
      <div className={`mt-5 animate-pulse rounded-2xl border p-5 ${border}`}>
        <div className={`h-24 rounded-lg ${isLight ? 'bg-gray-100' : 'bg-ash-800/60'}`} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${border} ${isLight ? 'text-orange-950' : 'text-amber-200/90'}`}>
        {error}
      </div>
    )
  }

  if (!context) {
    return (
      <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${border} ${isLight ? 'text-gray-700' : 'text-ash-300'}`}>
        Add a home street address in{' '}
        <Link href="/dashboard/settings?tab=profile" className="font-semibold text-orange-700 underline">
          Settings
        </Link>{' '}
        to see Flameo area stats. You can still complete your check-in below.
      </div>
    )
  }

  const incidents = context.incidents_nearby ?? []
  const n = incidents.length
  const nearest = nearestIncidentMiles(context)
  const radius = context.alert_radius_miles ?? 25
  const wx = context.weather_summary
  const feedsNote =
    status === 'feeds_partial' || status === 'feeds_unavailable'
      ? message ?? 'Some fire feeds may be delayed.'
      : null

  const statIconClass = isLight ? 'text-gray-900' : 'text-ash-200'

  const statCardClass = isLight ? 'border border-gray-200 bg-white' : 'border-ash-700/80 bg-ash-900/60'
  const statusColumnClass = isLight
    ? 'border border-slate-700 bg-slate-800'
    : 'border border-ash-700/80 bg-ash-950/60'

  return (
    <div className={`mt-5 overflow-hidden rounded-2xl border ${border}`}>
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${accent}`}>
          Automated area status
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-stretch sm:gap-4 sm:px-5 sm:pb-5">
        <div
          className={`flex w-full shrink-0 flex-col items-center justify-center rounded-xl px-3 py-4 sm:w-[25%] sm:min-w-[140px] sm:max-w-[260px] ${statusColumnClass}`}
        >
          <AlertJar level={level} size={variant === 'mobile' ? 52 : 56} />
        </div>

        <div className={`min-w-0 flex flex-1 flex-col rounded-xl border px-4 py-4 sm:px-5 sm:py-5 ${subBorder}`}>
          <p
            className={`mb-4 text-lg sm:text-xl font-bold uppercase tracking-wide ${liveLocationTitle}`}
          >
            Live Location Data
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className={`rounded-xl border px-3 py-2.5 ${statCardClass}`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${statText}`}>
                <Radio className={`h-3.5 w-3.5 shrink-0 ${statIconClass}`} strokeWidth={2.5} />
                Fires in radius
              </div>
              <div className={`mt-1 font-display text-lg font-bold tabular-nums ${statStrong}`}>{n}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${statCardClass}`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${statText}`}>
                <Target className={`h-3.5 w-3.5 shrink-0 ${statIconClass}`} strokeWidth={2.5} />
                Closest
              </div>
              <div className={`mt-1 font-display text-lg font-bold tabular-nums ${statStrong}`}>
                {nearest != null ? (nearest < 1 ? `${Math.round(nearest * 5280)} ft` : `${nearest.toFixed(1)} mi`) : '—'}
              </div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${statCardClass}`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${statText}`}>
                <Map className={`h-3.5 w-3.5 shrink-0 ${statIconClass}`} strokeWidth={2.5} />
                Alert radius
              </div>
              <div className={`mt-1 font-display text-lg font-bold tabular-nums ${statStrong}`}>{radius} mi</div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${statCardClass}`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${statText}`}>
                <ThermometerSun className={`h-3.5 w-3.5 shrink-0 ${statIconClass}`} strokeWidth={2.5} />
                Temp
              </div>
              <div className={`mt-1 font-display text-lg font-bold tabular-nums ${statStrong}`}>
                {wx?.temp_f != null ? `${Math.round(wx.temp_f)}°F` : '—'}
              </div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${statCardClass}`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${statText}`}>
                <Wind className={`h-3.5 w-3.5 shrink-0 ${statIconClass}`} strokeWidth={2.5} />
                Wind
              </div>
              <div className={`mt-1 font-display text-lg font-bold tabular-nums ${statStrong}`}>
                {wx?.wind_mph != null ? `${Math.round(wx.wind_mph)} mph` : '—'}
              </div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${statCardClass}`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase ${statText}`}>
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${statIconClass}`} strokeWidth={2.5} />
                Fire risk
              </div>
              <div className={`mt-1 text-sm font-semibold leading-tight ${statStrong}`}>
                {wx?.fire_risk?.trim() ? wx.fire_risk : '—'}
              </div>
            </div>
          </div>
          {feedsNote && (
            <p className={`mt-4 text-sm leading-relaxed ${isLight ? 'text-gray-800' : 'text-amber-200/80'}`}>{feedsNote}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function SafetyCheckIn({
  consumerRole = 'evacuee',
  variant = 'desktop',
}: {
  /** Legacy `caregiver` is treated the same as `evacuee` (unified consumer). */
  consumerRole?: 'evacuee' | 'caregiver'
  variant?: 'desktop' | 'mobile'
}) {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const mapHref =
    variant === 'mobile' ? '/m/dashboard/home/map' : '/dashboard/home/map'

  const fromAlert = searchParams.get('from') === 'alert'
  const fireIdFromAlert = searchParams.get('fireId')?.trim().slice(0, 120) || null

  const [subject, setSubject] = useState<Subject>('self')
  const [monitoredIds, setMonitoredIds] = useState<{ id: string; name: string }[]>([])

  const [homeCurrent, setHomeCurrent] = useState<HomeEvacuationStatus | null>(null)
  const [homeSelected, setHomeSelected] = useState<HomeEvacuationStatus | null>(null)
  const [homeSaving, setHomeSaving] = useState(false)
  const [homeSaved, setHomeSaved] = useState(false)
  const [homeUpdatedAt, setHomeUpdatedAt] = useState<string | null>(null)

  const [safetyCurrent, setSafetyCurrent] = useState<PersonSafetyStatus | null>(null)
  const [safetySelected, setSafetySelected] = useState<PersonSafetyStatus | null>(null)
  const [shelterName, setShelterName] = useState('')
  const [locationNote, setLocationNote] = useState('')
  const [safetySaving, setSafetySaving] = useState(false)
  const [safetySaved, setSafetySaved] = useState(false)
  const [safetyUpdatedAt, setSafetyUpdatedAt] = useState<string | null>(null)

  const [monitoredHome, setMonitoredHome] = useState<HomeEvacuationStatus | null>(null)
  const [monitoredSelected, setMonitoredSelected] = useState<HomeEvacuationStatus | null>(null)
  const [monitoredLocation, setMonitoredLocation] = useState('')
  const [monitoredSaving, setMonitoredSaving] = useState(false)
  const [monitoredSaved, setMonitoredSaved] = useState(false)
  const [monitoredUpdatedAt, setMonitoredUpdatedAt] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [recentCheckins, setRecentCheckins] = useState<
    { status: string; location_name: string | null; updated_at: string }[]
  >([])
  const [userId, setUserId] = useState<string | null>(null)

  const flameoCtx = useFlameoContext({ role: 'evacuee' })
  const autoAreaLevel = useMemo(
    () => alertLevelFromFlameoContext(flameoCtx.context),
    [flameoCtx.context]
  )

  const eyebrow = 'CHECK-IN'

  const others = useMemo(
    () => monitoredIds.filter(p => p.id !== 'self-user'),
    [monitoredIds]
  )

  const loadCurrent = useCallback(async () => {
    if (!userId) return
    if (subject === 'self') {
      const { data: prof } = await supabase
        .from('profiles')
        .select(
          'home_evacuation_status, home_status_updated_at, person_safety_status, safety_shelter_name, safety_location_note, safety_status_updated_at'
        )
        .eq('id', userId)
        .maybeSingle()

      let home: HomeEvacuationStatus = 'not_evacuated'
      let safety: PersonSafetyStatus | null = null
      let sh = ''
      let ln = ''
      let hu: string | null = null
      let su: string | null = null

      const p = prof as Record<string, unknown> | null
      if (p && isHomeEvacuationStatus(p.home_evacuation_status as string)) {
        home = p.home_evacuation_status as HomeEvacuationStatus
        hu = (p.home_status_updated_at as string) || null
      }
      if (p && isPersonSafetyStatus(p.person_safety_status as string)) {
        safety = p.person_safety_status as PersonSafetyStatus
        sh = (p.safety_shelter_name as string) || ''
        ln = (p.safety_location_note as string) || ''
        su = (p.safety_status_updated_at as string) || null
      }

      const { data: record } = await supabase
        .from('evacuee_records')
        .select('status, updated_at')
        .eq('user_id', userId)
        .maybeSingle()

      if ((!p?.home_evacuation_status || !isHomeEvacuationStatus(String(p.home_evacuation_status))) && record?.status) {
        const m = mapLegacyCheckinToDual(record.status)
        home = m.home
        if (!safety && m.safety) safety = m.safety
        hu = record.updated_at || hu
      }

      setHomeCurrent(home)
      setHomeSelected(home)
      setHomeUpdatedAt(hu)
      setSafetyCurrent(safety)
      setSafetySelected(safety)
      setShelterName(sh)
      setLocationNote(ln)
      setSafetyUpdatedAt(su)
      return
    }

    const { data: row } = await supabase
      .from('monitored_person_checkins')
      .select('*')
      .eq('caregiver_user_id', userId)
      .eq('monitored_person_id', subject)
      .maybeSingle()

    if (row?.status) {
      const home = isHomeEvacuationStatus(row.status)
        ? row.status
        : mapLegacyCheckinToDual(row.status).home
      setMonitoredHome(home)
      setMonitoredSelected(home)
      setMonitoredLocation(row.location_name || '')
      setMonitoredUpdatedAt(row.updated_at)
    } else {
      setMonitoredHome(null)
      setMonitoredSelected(null)
      setMonitoredLocation('')
      setMonitoredUpdatedAt(null)
    }
  }, [supabase, userId, subject])

  useEffect(() => {
    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)
      const list = await loadPersons(supabase, user.id)
      setMonitoredIds(
        (list as { id: string; name: string }[]).map(p => ({
          id: p.id,
          name: p.name || 'Person',
        }))
      )
      const { data: recent } = await supabase
        .from('evacuee_records')
        .select('status, location_name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)
      if (recent) setRecentCheckins(recent)
      setLoading(false)
    }
    boot()
  }, [supabase])

  useEffect(() => {
    if (!userId || loading) return
    loadCurrent()
  }, [userId, loading, loadCurrent])

  async function saveHomeSelf() {
    if (!homeSelected || !userId) return
    setHomeSaving(true)
    setHomeSaved(false)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('profiles')
        .update({
          home_evacuation_status: homeSelected,
          home_status_updated_at: now,
        })
        .eq('id', userId)
      if (error) {
        setHomeSaving(false)
        return
      }
      await supabase.from('evacuee_records').upsert(
        {
          user_id: userId,
          status: homeSelected,
          location_name: null,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      setHomeCurrent(homeSelected)
      setHomeUpdatedAt(now)
      setHomeSaved(true)
      setTimeout(() => setHomeSaved(false), 3000)
    } finally {
      setHomeSaving(false)
    }
  }

  async function saveSafetySelf() {
    if (!safetySelected || !userId) return
    setSafetySaving(true)
    setSafetySaved(false)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('profiles')
        .update({
          person_safety_status: safetySelected,
          safety_shelter_name:
            safetySelected === 'at_shelter' ? shelterName.trim() || null : null,
          safety_location_note:
            safetySelected === 'safe_elsewhere' ? locationNote.trim() || null : null,
          safety_status_updated_at: now,
        })
        .eq('id', userId)
      if (error) {
        setSafetySaving(false)
        return
      }
      setSafetyCurrent(safetySelected)
      setSafetyUpdatedAt(now)
      setSafetySaved(true)
      setTimeout(() => setSafetySaved(false), 3000)
    } finally {
      setSafetySaving(false)
    }
  }

  async function saveMonitoredHome() {
    if (!monitoredSelected || !userId) return
    setMonitoredSaving(true)
    setMonitoredSaved(false)
    try {
      const res = await fetch('/api/evacuee-records/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'monitored',
          monitored_person_id: subject,
          status: monitoredSelected,
          location_name: monitoredLocation || null,
        }),
      })
      if (!res.ok) {
        setMonitoredSaving(false)
        return
      }
      setMonitoredHome(monitoredSelected)
      setMonitoredUpdatedAt(new Date().toISOString())
      setMonitoredSaved(true)
      setTimeout(() => setMonitoredSaved(false), 3000)
    } finally {
      setMonitoredSaving(false)
    }
  }

  const activePersonName = others.find(p => p.id === subject)?.name

  if (variant === 'mobile') {
    return (
      <div className="min-h-full">
        <div className="px-4 pt-10 pb-5 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 text-orange-800 text-xs font-semibold uppercase tracking-widest mb-1">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} /> {eyebrow}
          </div>
          <h1 className="font-display font-bold text-2xl text-gray-900">Safety Check-In</h1>
          <p className="text-gray-500 text-sm mt-1">
            Let emergency services and loved ones know you&apos;re safe.
          </p>
          <FlameoAutomatedAreaPanel
            loading={flameoCtx.loading}
            error={flameoCtx.error}
            context={flameoCtx.context}
            status={flameoCtx.status}
            message={flameoCtx.message}
            level={autoAreaLevel}
            variant="mobile"
          />
          {others.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => setSubject('self')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  subject === 'self'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                Me
              </button>
              {others.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSubject(p.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border truncate max-w-[140px] ${
                    subject === p.id
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {fromAlert && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Elevated fire activity reported near your area — updating your status helps loved ones and
              responders.{' '}
              <Link href={mapHref} className="font-semibold underline">
                View Evacuation Map
              </Link>
              {fireIdFromAlert && (
                <span className="block mt-1.5 text-amber-800/80">Alert reference: {fireIdFromAlert}</span>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-5 space-y-8">
          {!loading && subject !== 'self' && activePersonName && (
            <p className="text-sm text-gray-600">
              Updating home status for <strong>{activePersonName}</strong>.
            </p>
          )}

          {subject !== 'self' ? (
            <div className="space-y-3">
              <h2 className="text-gray-900 font-semibold text-sm">Home status</h2>
              {HOME_CHECKIN_STATUS_OPTIONS.map(opt => {
                const Icon = HOME_ICONS[opt.value]
                const active = monitoredSelected === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMonitoredSelected(opt.value)}
                    className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
                      active ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0 text-gray-800" strokeWidth={2.25} />
                      <div className="flex-1">
                        <div
                          className={`font-semibold text-sm ${active ? 'text-green-900' : 'text-gray-900'}`}
                        >
                          {opt.label}
                        </div>
                        {active && opt.desc && (
                          <div className="text-xs mt-0.5 text-gray-600">{opt.desc}</div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
              <label className="block text-xs font-medium text-gray-600">
                Note (optional)
                <input
                  type="text"
                  value={monitoredLocation}
                  onChange={e => setMonitoredLocation(e.target.value)}
                  placeholder="Location context"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={saveMonitoredHome}
                disabled={!monitoredSelected || monitoredSaving}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                {monitoredSaving ? 'Saving…' : monitoredSaved ? '✓ Saved' : 'Save home status'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
              <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3">
                  <h2 className="font-semibold text-gray-900">My Home Status</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Used by emergency responders for door-to-door checks
                  </p>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-3">
                  {HOME_CHECKIN_STATUS_OPTIONS.map(opt => {
                    const Icon = HOME_ICONS[opt.value]
                    const active = homeSelected === opt.value
                    const title = HOME_OPTION_TITLE[opt.value]
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setHomeSelected(opt.value)}
                        className={`min-h-[5rem] rounded-xl border-2 p-3.5 text-left transition-all sm:p-4 ${
                          active ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-gray-50/80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-900" strokeWidth={2.5} />
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-sm font-semibold ${active ? 'text-green-900' : 'text-gray-900'}`}
                            >
                              {title}
                            </div>
                            {opt.desc && (
                              <p className="mt-1 text-xs leading-snug text-gray-600">{opt.desc}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {homeUpdatedAt && (
                  <p className="mt-3 flex items-center gap-1 text-[11px] text-gray-500">
                    <Clock className="h-3 w-3" />
                    Last updated {new Date(homeUpdatedAt).toLocaleString()}
                  </p>
                )}
                <button
                  type="button"
                  onClick={saveHomeSelf}
                  disabled={!homeSelected || homeSaving}
                  className="mt-4 w-full rounded-xl border-2 border-green-700 py-3 text-sm font-semibold text-green-800 disabled:opacity-40"
                >
                  {homeSaving ? 'Saving…' : homeSaved ? '✓ Saved' : 'Save home status'}
                </button>
              </section>

              <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3">
                  <h2 className="font-semibold text-gray-900">My Personal Safety</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Shared with your family</p>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  {PERSON_SAFETY_CHECKIN_STATUS_OPTIONS.map(opt => {
                    const Icon = SAFETY_ICONS[opt.value]
                    const active = safetySelected === opt.value
                    const copy = SAFETY_OPTION_COPY[opt.value]
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSafetySelected(opt.value)}
                        className={`min-h-[5rem] rounded-xl border-2 p-3.5 text-left transition-all sm:p-4 ${
                          active ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-gray-50/80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-900" strokeWidth={2.5} />
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-sm font-semibold ${active ? 'text-amber-950' : 'text-gray-900'}`}
                            >
                              {copy.title}
                            </div>
                            <p className="mt-1 text-xs leading-snug text-gray-600">{copy.desc}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {safetySelected === 'at_shelter' && (
                  <label className="mt-3 block text-xs font-medium text-gray-600">
                    Which shelter?
                    <input
                      type="text"
                      value={shelterName}
                      onChange={e => setShelterName(e.target.value)}
                      placeholder="e.g. Red Cross — Pasadena High"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                    />
                  </label>
                )}
                {safetySelected === 'safe_elsewhere' && (
                  <label className="mt-3 block text-xs font-medium text-gray-600">
                    Any details?
                    <input
                      type="text"
                      value={locationNote}
                      onChange={e => setLocationNote(e.target.value)}
                      placeholder="Brief note (optional)"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                    />
                  </label>
                )}
                {safetyUpdatedAt && (
                  <p className="mt-3 flex items-center gap-1 text-[11px] text-gray-500">
                    <Clock className="h-3 w-3" />
                    Last updated {new Date(safetyUpdatedAt).toLocaleString()}
                  </p>
                )}
                <button
                  type="button"
                  onClick={saveSafetySelf}
                  disabled={!safetySelected || safetySaving}
                  className="mt-4 w-full rounded-xl py-3.5 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                >
                  {safetySaving ? 'Saving…' : safetySaved ? '✓ Saved' : 'Save personal safety'}
                </button>
              </section>
            </div>
          )}

          <p className="text-center text-[11px] leading-relaxed text-gray-500 sm:text-left">
            Flameo uses your home address and alert radius. Your selections below tell others your{' '}
            <span className="font-medium text-gray-700">actual</span> situation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
          <CheckCircle className="w-4 h-4" />
          {eyebrow}
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">Safety Check-In</h1>
        <p className="text-ash-400">
          Let emergency services and loved ones know you&apos;re safe. Update each section as your
          situation changes.
        </p>
        <FlameoAutomatedAreaPanel
          loading={flameoCtx.loading}
          error={flameoCtx.error}
          context={flameoCtx.context}
          status={flameoCtx.status}
          message={flameoCtx.message}
          level={autoAreaLevel}
          variant="desktop"
        />
        {others.length > 0 && (
          <div className="mt-6">
            <h2 className="text-white text-sm font-semibold mb-2">Who are you updating?</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSubject('self')}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  subject === 'self'
                    ? 'border-ember-500 bg-ember-500/20 text-white'
                    : 'border-ash-700 text-ash-400 hover:border-ash-600'
                }`}
              >
                Me
              </button>
              {others.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSubject(p.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all truncate max-w-[200px] ${
                    subject === p.id
                      ? 'border-ember-500 bg-ember-500/20 text-white'
                      : 'border-ash-700 text-ash-400 hover:border-ash-600'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <Link
              href="/dashboard/home/persons"
              className="inline-block mt-2 text-xs text-amber-400/90 hover:underline"
            >
              Manage My People
            </Link>
          </div>
        )}
        {subject !== 'self' && activePersonName && (
          <p className="text-ash-500 text-sm mt-4">
            Updating home status for{' '}
            <span className="text-white font-medium">{activePersonName}</span>.
          </p>
        )}
      </div>

      {fromAlert && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/90">
            Elevated fire activity reported near your area — updating your status helps loved ones and
            responders.{' '}
            <Link href={mapHref} className="font-semibold text-amber-300 underline inline-flex items-center gap-1">
              <Map className="w-3.5 h-3.5" /> View Evacuation Map
            </Link>
            {fireIdFromAlert && (
              <span className="block mt-2 text-xs text-amber-200/80">Alert reference: {fireIdFromAlert}</span>
            )}
          </div>
        </div>
      )}

      {!loading && subject === 'self' && (homeCurrent || safetyCurrent) && (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {homeCurrent && (
            <div className="flex items-start gap-3 rounded-xl border border-ash-700 bg-ash-900/50 p-4">
              {(() => {
                const Ic = HOME_ICONS[homeCurrent]
                return (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ash-800/80">
                    <Ic className="h-5 w-5 text-ash-600" strokeWidth={2.5} />
                  </div>
                )
              })()}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ash-500">Home</div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-white">
                  {HOME_OPTION_TITLE[homeCurrent]}
                </div>
              </div>
            </div>
          )}
          {safetyCurrent && (
            <div className="flex items-start gap-3 rounded-xl border border-ash-700 bg-ash-900/50 p-4">
              {(() => {
                const Ic = SAFETY_ICONS[safetyCurrent]
                return (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ash-800/80">
                    <Ic className="h-5 w-5 text-ash-600" strokeWidth={2.5} />
                  </div>
                )
              })()}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ash-500">
                  Personal safety
                </div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-white">
                  {SAFETY_OPTION_COPY[safetyCurrent].title}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subject !== 'self' ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-white font-semibold text-lg">Home status</h2>
            <p className="text-ash-500 text-sm">Used by emergency responders for door-to-door checks</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HOME_CHECKIN_STATUS_OPTIONS.map(({ value, label, desc }) => {
              const Icon = HOME_ICONS[value]
              const activeClass = HOME_ACTIVE[value]
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMonitoredSelected(value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    monitoredSelected === value
                      ? activeClass
                      : 'bg-ash-900 border-ash-800 hover:border-ash-700 hover:bg-ash-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 shrink-0 ${monitoredSelected === value ? '' : 'text-ash-600'}`} />
                    <span
                      className={`text-sm font-medium ${monitoredSelected === value ? 'text-white' : 'text-ash-300'}`}
                    >
                      {label}
                    </span>
                  </div>
                  {desc && <p className="text-xs text-ash-500 pl-6">{desc}</p>}
                </button>
              )
            })}
          </div>
          <label className="block text-ash-300 text-sm font-medium mb-2">
            Note <span className="text-ash-600">(optional)</span>
          </label>
          <input
            type="text"
            value={monitoredLocation}
            onChange={e => setMonitoredLocation(e.target.value)}
            className="w-full bg-ash-900 border border-ash-700 rounded-xl px-4 py-3 text-white placeholder-ash-600 text-sm focus:outline-none focus:border-ash-500 transition-colors"
          />
          {monitoredUpdatedAt && (
            <p className="text-xs text-ash-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last updated {new Date(monitoredUpdatedAt).toLocaleString()}
            </p>
          )}
          <button
            type="button"
            onClick={saveMonitoredHome}
            disabled={!monitoredSelected || monitoredSaving}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-ember-500 hover:bg-ember-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {monitoredSaving ? 'Saving…' : monitoredSaved ? '✓ Saved' : 'Save home status'}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8">
            <section className="flex flex-col rounded-2xl border border-ash-800 bg-ash-900/50 p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">My Home Status</h2>
                <p className="mt-1 text-sm text-ash-500">
                  Used by emergency responders for door-to-door checks
                </p>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3">
                {HOME_CHECKIN_STATUS_OPTIONS.map(({ value, desc }) => {
                  const Icon = HOME_ICONS[value]
                  const activeClass = HOME_ACTIVE[value]
                  const title = HOME_OPTION_TITLE[value]
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setHomeSelected(value)}
                      className={`min-h-[5.5rem] rounded-xl border p-4 text-left transition-all ${
                        homeSelected === value
                          ? activeClass
                          : 'border-ash-800 bg-ash-900 hover:border-ash-700 hover:bg-ash-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${homeSelected === value ? '' : 'text-ash-600'}`} strokeWidth={2.5} />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm font-semibold ${homeSelected === value ? 'text-white' : 'text-ash-200'}`}
                          >
                            {title}
                          </div>
                          {desc && (
                            <p className="mt-1 text-xs leading-snug text-ash-500">{desc}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {homeUpdatedAt && (
                <p className="mt-4 flex items-center gap-1 text-xs text-ash-500">
                  <Clock className="h-3 w-3" />
                  Last updated {new Date(homeUpdatedAt).toLocaleString()}
                </p>
              )}
              <button
                type="button"
                onClick={saveHomeSelf}
                disabled={!homeSelected || homeSaving}
                className="mt-4 w-full rounded-xl bg-forest-700 py-3 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-50"
              >
                {homeSaving ? 'Saving…' : homeSaved ? '✓ Saved' : 'Save home status'}
              </button>
            </section>

            <section className="flex flex-col rounded-2xl border border-ash-800 bg-ash-900/50 p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">My Personal Safety</h2>
                <p className="mt-1 text-sm text-ash-500">Shared with your family</p>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                {PERSON_SAFETY_CHECKIN_STATUS_OPTIONS.map(({ value }) => {
                  const Icon = SAFETY_ICONS[value]
                  const activeClass = SAFETY_ACTIVE[value]
                  const copy = SAFETY_OPTION_COPY[value]
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSafetySelected(value)}
                      className={`min-h-[5.5rem] rounded-xl border p-4 text-left transition-all ${
                        safetySelected === value
                          ? activeClass
                          : 'border-ash-800 bg-ash-900 hover:border-ash-700 hover:bg-ash-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${safetySelected === value ? '' : 'text-ash-600'}`} strokeWidth={2.5} />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm font-semibold ${safetySelected === value ? 'text-white' : 'text-ash-200'}`}
                          >
                            {copy.title}
                          </div>
                          <p className="mt-1 text-xs leading-snug text-ash-500">{copy.desc}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {safetySelected === 'at_shelter' && (
                <label className="mt-4 block text-sm font-medium text-ash-300">
                  Which shelter?
                  <input
                    type="text"
                    value={shelterName}
                    onChange={e => setShelterName(e.target.value)}
                    placeholder="e.g. Red Cross — Pasadena High"
                    className="mt-1.5 w-full rounded-xl border border-ash-700 bg-ash-900 px-4 py-3 text-sm text-white placeholder-ash-600 transition-colors focus:border-ash-500 focus:outline-none"
                  />
                </label>
              )}
              {safetySelected === 'safe_elsewhere' && (
                <label className="mt-4 block text-sm font-medium text-ash-300">
                  Any details?
                  <input
                    type="text"
                    value={locationNote}
                    onChange={e => setLocationNote(e.target.value)}
                    placeholder="Brief note (optional)"
                    className="mt-1.5 w-full rounded-xl border border-ash-700 bg-ash-900 px-4 py-3 text-sm text-white placeholder-ash-600 transition-colors focus:border-ash-500 focus:outline-none"
                  />
                </label>
              )}
              {safetyUpdatedAt && (
                <p className="mt-4 flex items-center gap-1 text-xs text-ash-500">
                  <Clock className="h-3 w-3" />
                  Last updated {new Date(safetyUpdatedAt).toLocaleString()}
                </p>
              )}
              <button
                type="button"
                onClick={saveSafetySelf}
                disabled={!safetySelected || safetySaving}
                className="mt-4 w-full rounded-xl bg-amber-700/90 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {safetySaving ? 'Saving…' : safetySaved ? '✓ Saved' : 'Save personal safety'}
              </button>
            </section>
          </div>
        </>
      )}

      {recentCheckins.length > 0 && subject === 'self' && (
        <div className="mt-10">
          <h2 className="section-title mb-4">Recent Community Check-Ins</h2>
          <div className="card divide-y divide-ash-800">
            {recentCheckins.map((record, i) => {
              const home = isHomeEvacuationStatus(record.status)
                ? record.status
                : mapLegacyCheckinToDual(record.status).home
              const label = labelForHomeEvacuationStatus(home)
              const Ic = HOME_ICONS[home]
              return (
                <div key={i} className="p-4 flex items-center gap-3">
                  <Ic className="w-4 h-4 shrink-0 text-ash-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{label}</div>
                    {record.location_name && (
                      <div className="text-ash-500 text-xs truncate">{record.location_name}</div>
                    )}
                  </div>
                  <div className="text-ash-600 text-xs shrink-0">
                    {new Date(record.updated_at).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="mt-12 max-w-2xl text-[11px] leading-relaxed text-ash-500">
        Flameo uses your home address and alert radius. Your selections below tell others your{' '}
        <span className="font-medium text-ash-400">actual</span> situation.
      </p>
    </div>
  )
}

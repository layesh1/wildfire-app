'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Copy, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type RosterJson = {
  station: {
    id: string
    station_name: string
    incident_name: string | null
    incident_zone: string | null
    created_at: string
    is_commander: boolean
  } | null
  active_invite: {
    code: string
    expires_at: string | null
    uses_count: number | null
    max_uses: number | null
  } | null
  members: Array<{
    id: string
    firefighter_id: string
    full_name: string | null
    joined_at: string | null
    last_seen_at: string | null
    current_assignment: string | null
    status: string | null
  }>
}

function expiresInLabel(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry set'
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (!Number.isFinite(ms)) return 'Unknown'
  if (ms <= 0) return 'Expired'
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000))
  if (d <= 1) return 'Expires in 1 day'
  return `Expires in ${d} days`
}

export default function ResponderStationPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const [roster, setRoster] = useState<RosterJson | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [stationName, setStationName] = useState('')
  const [incidentName, setIncidentName] = useState('')
  const [incidentZone, setIncidentZone] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/station/roster')
      if (!res.ok) {
        setRoster(null)
        setError('Could not load station.')
        return
      }
      const j = (await res.json()) as RosterJson
      setRoster(j)
      if (j.station) {
        setStationName(j.station.station_name ?? '')
        setIncidentName(j.station.incident_name ?? '')
        setIncidentZone(j.station.incident_zone ?? '')
      }
    } catch {
      setError('Could not load station.')
      setRoster(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const commander = roster?.station?.is_commander ?? false
  const hasStation = !!roster?.station

  const saveStationInfo = async () => {
    if (!commander) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/station/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_name: stationName.trim(),
          incident_name: incidentName.trim() || null,
          incident_zone: incidentZone.trim() || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Save failed')
        return
      }
      await load()
    } catch {
      setError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const createStation = async () => {
    const name = stationName.trim()
    if (!name) {
      setError('Enter a station name first.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/station/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_name: name,
          incident_name: incidentName.trim() || undefined,
          incident_zone: incidentZone.trim() || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.status === 409 && j.station_id) {
        setError('You already have a station. Refresh the page.')
        await load()
        return
      }
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Could not create station')
        return
      }
      await load()
    } catch {
      setError('Could not create station')
    } finally {
      setCreating(false)
    }
  }

  const regenerateCode = async () => {
    setRegenBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/station/invite/regenerate', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Could not generate code')
        return
      }
      await load()
    } catch {
      setError('Could not generate code')
    } finally {
      setRegenBusy(false)
    }
  }

  const copyCode = async () => {
    const code = roster?.active_invite?.code
    if (!code || typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(code)
      setCopyOk(true)
      window.setTimeout(() => setCopyOk(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-1 items-center justify-center bg-[var(--wfa-page-bg,#f9fafb)] dark:bg-[var(--wfa-page-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" aria-label="Loading" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl flex-1 px-4 py-8 text-gray-900 dark:text-gray-100">
      <div className="mb-8 flex items-start gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 dark:border-amber-800/50 dark:bg-amber-950/40">
          <Users className="h-7 w-7 text-amber-800 dark:text-amber-300" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Station &amp; Incident Setup</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Commanders create a station and share an invite code with field units.{' '}
            <Link href="/dashboard/responder" className="font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-400">
              Back to command hub
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Section 1 — Station info</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
            Station name
            <input
              value={stationName}
              onChange={e => setStationName(e.target.value)}
              disabled={!commander && hasStation}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 disabled:opacity-60"
              placeholder="e.g. Clayton Fire Station 2"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
            Incident name <span className="font-normal text-gray-400">(optional)</span>
            <input
              value={incidentName}
              onChange={e => setIncidentName(e.target.value)}
              disabled={!commander && hasStation}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 disabled:opacity-60"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
            Incident zone <span className="font-normal text-gray-400">(optional)</span>
            <input
              value={incidentZone}
              onChange={e => setIncidentZone(e.target.value)}
              disabled={!commander && hasStation}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 disabled:opacity-60"
            />
          </label>
        </div>
        {commander && hasStation && (
          <button
            type="button"
            onClick={() => void saveStationInfo()}
            disabled={saving || !stationName.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save station info
          </button>
        )}
        {commander && !hasStation && (
          <button
            type="button"
            onClick={() => void createStation()}
            disabled={creating || !stationName.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create station &amp; invite code
          </button>
        )}
        {!commander && hasStation && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Only the station creator can edit station details. You are connected as a field unit.
          </p>
        )}
      </section>

      {commander && hasStation && (
        <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Section 2 — Firefighter invite code
          </h2>
          {roster?.active_invite ? (
            <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-950/50">
              <div className="font-mono text-xl font-bold tracking-wider text-gray-900 dark:text-white sm:text-2xl">
                {roster.active_invite.code}
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{expiresInLabel(roster.active_invite.expires_at)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Used by{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {roster.active_invite.uses_count ?? 0}
                </span>{' '}
                firefighter{(roster.active_invite.uses_count ?? 0) === 1 ? '' : 's'}{' '}
                <span className="text-gray-400">(max {roster.active_invite.max_uses ?? 50})</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold dark:border-gray-600',
                    copyOk ? 'border-emerald-500 text-emerald-700' : ''
                  )}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copyOk ? 'Copied' : 'Copy code'}
                </button>
                <button
                  type="button"
                  onClick={() => void regenerateCode()}
                  disabled={regenBusy}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', regenBusy && 'animate-spin')} />
                  Generate new code
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No active code. Generate one for your station.
              </p>
              <button
                type="button"
                onClick={() => void regenerateCode()}
                disabled={regenBusy || !hasStation}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', regenBusy && 'animate-spin')} />
                Generate invite code
              </button>
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            This <strong className="text-gray-800 dark:text-gray-200">station join code</strong> is how firefighters{' '}
            <strong className="text-gray-800 dark:text-gray-200">sign up</strong> to join your roster. On the{' '}
            <strong className="text-gray-800 dark:text-gray-200">Minutes Matter iOS app</strong>, it is the{' '}
            <strong className="text-gray-800 dark:text-gray-200">only</strong> signup path for that flow. It is{' '}
            <strong className="text-gray-800 dark:text-gray-200">not</strong> the organization access code commanders use to unlock
            the <strong className="text-gray-800 dark:text-gray-200">Emergency Responder Command Hub</strong> on the web. Share this
            code with your crew so they can join your station.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Section 3 — Connected firefighters
        </h2>
        {!hasStation ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">No station yet. Create a station above to see roster.</p>
        ) : roster?.members.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">No firefighters have joined yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {roster!.members.map(m => (
              <li
                key={m.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-950/40"
              >
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{m.full_name?.trim() || 'Firefighter'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Joined {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                    {m.last_seen_at && (
                      <>
                        {' · '}
                        Last seen {new Date(m.last_seen_at).toLocaleString()}
                      </>
                    )}
                  </div>
                  {m.current_assignment?.trim() && (
                    <div className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                      Assignment: {m.current_assignment.trim()}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                    m.status === 'active'
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : m.status === 'off_duty'
                        ? 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        : 'bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200'
                  )}
                >
                  {m.status || 'active'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

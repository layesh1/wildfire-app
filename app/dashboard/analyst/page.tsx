'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
  Sparkles,
  Database,
  Brain,
  MapPin,
  Shield,
  Radio,
  ArrowRight,
} from 'lucide-react'

const FLAMEO_DATA_LAYERS = [
  {
    title: 'Incident & perimeter feeds',
    body:
      'Live NIFC-style perimeters and point incidents scope proximity alerts, command hub maps, and evacuation context. Analyst views (density, live map, trends) consume the same enriched incident backbone.',
  },
  {
    title: 'Fire weather & fuels',
    body:
      'Open-Meteo and fire-weather style indices inform spread visualization (e.g. Van Wagner length–breadth), red-flag awareness, and scenario labs — the same signals responders see in the field hub.',
  },
  {
    title: 'Community & equity signals',
    body:
      'SVI, signal-gap, and NRI-style panels ground “who gets warned and when” — feeding Flameo’s equity-aware briefing copy and your Hidden danger / Signal gap analyses.',
  },
  {
    title: 'Geocoding & anchors',
    body:
      'Verified street anchors (home, station, work) drive radius queries, shelter proximity, and directions. Flameo context APIs use these coordinates so the agent speaks to real places, not abstract regions.',
  },
]

const FLAMEO_MODEL_USE = [
  {
    title: 'Spread & geometry models',
    body:
      'Ellipse and time-horizon spread math (Wind + Van Wagner LW) power prediction map demos and command-style risk halos. ML predictor and simulation pages let you stress-test those assumptions against historical patterns.',
  },
  {
    title: 'Risk scoring & prioritization',
    body:
      'Containment, acres, and demographic overlays rank what the agent should mention first — aligning chat with map severity and equity metrics.',
  },
  {
    title: 'Agent orchestration',
    body:
      'Flameo merges structured context (profile, role, fire list, shelters) with LLM reasoning so households get actionable steps while analysts retain transparent charts behind every claim.',
  },
]

export default function AnalystOverviewPage() {
  const [activeFiresCount, setActiveFiresCount] = useState<number | null>(null)
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null)
  const [headerUpdatedAt, setHeaderUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    setHeaderUpdatedAt(new Date())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/active-fires')
        const data = await res.json()
        const n = Array.isArray(data?.fires) ? data.fires.length : null
        if (!cancelled && n != null && n > 0) {
          setActiveFiresCount(n)
          setStatsUpdatedAt(new Date())
        }
      } catch {
        /* optional stat */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const quickStats: { label: string; value: string; show: boolean; hint?: string }[] = [
    {
      label: 'Active fires (snapshot)',
      value: activeFiresCount != null ? String(activeFiresCount) : '—',
      show: true,
      hint: activeFiresCount != null && statsUpdatedAt ? `Updated ${statsUpdatedAt.toLocaleTimeString()}` : 'Connects to live feed when available',
    },
    { label: 'US counties (reference)', value: '3,144', show: true },
    { label: 'Primary analyst data channels', value: '9+', show: true, hint: 'NIFC, weather, SVI/NRI, WatchDuty-enriched sets, geocoding, shelters, profiles' },
  ]

  return (
    <div className="mx-auto max-w-7xl p-6 text-gray-700 md:p-8 dark:text-gray-300">
      <header className="mb-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Overview
            </p>
            <h2 className="font-display text-2xl font-bold text-gray-900 md:text-3xl dark:text-white">
              Platform snapshot
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              This hub connects wildfire science, operational data, and the Flameo safety agent. Use the five top
              tabs to drill into prediction, evacuation equity, impact, and geospatial trends — each tab exposes a
              second row of tools so you stay oriented without a long sidebar list.
            </p>
          </div>
          {headerUpdatedAt && (
            <p className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-3.5 w-3.5 opacity-70" aria-hidden />
              {headerUpdatedAt.toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {quickStats
            .filter(s => s.show)
            .map(s => (
              <div
                key={s.label}
                className="min-w-[10rem] rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/80"
              >
                <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{s.value}</div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
                {s.hint && (
                  <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{s.hint}</div>
                )}
              </div>
            ))}
        </div>
      </header>

      <section className="mb-10 rounded-2xl border border-forest-200/60 bg-gradient-to-br from-forest-50/90 to-white p-6 dark:border-amber-900/30 dark:from-amber-950/20 dark:to-gray-900/40">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-forest-700 dark:text-amber-400" aria-hidden />
          <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">
            How Flameo uses your data &amp; models
          </h3>
        </div>
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          Flameo is not a single model — it is an <strong>agent layer</strong> that composes live wildfire data,
          verified locations, weather, and research-style analytics so households and responders get consistent,
          place-aware guidance. Every module in this dashboard corresponds to a signal the agent can draw on.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-forest-800 dark:text-amber-200/90">
              <Database className="h-4 w-4" aria-hidden />
              Data fused into context
            </h4>
            <ul className="space-y-4">
              {FLAMEO_DATA_LAYERS.map(item => (
                <li key={item.title}>
                  <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600 dark:text-gray-400">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-forest-800 dark:text-amber-200/90">
              <Brain className="h-4 w-4" aria-hidden />
              Models &amp; reasoning stack
            </h4>
            <ul className="space-y-4">
              {FLAMEO_MODEL_USE.map(item => (
                <li key={item.title}>
                  <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-snug text-gray-600 dark:text-gray-400">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-forest-200/40 pt-5 dark:border-amber-900/25">
          <Link
            href="/dashboard/analyst/ml"
            className="inline-flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-700 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Open fire prediction
            <ArrowRight className="h-4 w-4 opacity-80" aria-hidden />
          </Link>
          <Link
            href="/dashboard/analyst/data-health"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Data health &amp; methodology
          </Link>
        </div>
      </section>

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800/60">
          <Shield className="mb-2 h-8 w-8 text-forest-600 dark:text-amber-400" aria-hidden />
          <h3 className="font-display font-bold text-gray-900 dark:text-white">Responder alignment</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Command hub and consent-gated household views reuse the same anchors and NIFC radius logic you validate
            here — keeping analyst conclusions aligned with operational maps.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800/60">
          <Radio className="mb-2 h-8 w-8 text-forest-600 dark:text-amber-400" aria-hidden />
          <h3 className="font-display font-bold text-gray-900 dark:text-white">Evacuation intelligence</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Signal gap and hidden-danger studies inform who may be under-warned — inputs Flameo can surface when
            discussing equity and timing of orders.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800/60">
          <Brain className="mb-2 h-8 w-8 text-forest-600 dark:text-amber-400" aria-hidden />
          <h3 className="font-display font-bold text-gray-900 dark:text-white">Continuous improvement</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Trends and data-health pages track how complete and fresh feeds are — the precondition for trustworthy
            agent answers at scale.
          </p>
        </div>
      </section>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
        <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-gray-200">Dataset note:</span> Operational views and
          Flameo context combine live feeds — including{' '}
          <span className="text-gray-700 dark:text-gray-300">NIFC / Esri</span>,{' '}
          <span className="text-gray-700 dark:text-gray-300">NASA FIRMS</span>,{' '}
          <span className="text-gray-700 dark:text-gray-300">Open-Meteo</span>, curated shelter and hazard layers,
          Google geocoding and routing, and Supabase profiles and incident data. Some equity and signal-gap analytics
          use the WiDS / WatchDuty-enriched longitudinal set (prescribed burns and non-wildfire noise excluded) for
          comparable statistics — not as the sole source for the whole product. See{' '}
          <Link href="/dashboard/analyst/data-health" className="text-forest-700 underline underline-offset-2 dark:text-amber-400">
            Data health
          </Link>{' '}
          for lineage and refresh expectations.
        </p>
      </div>
    </div>
  )
}

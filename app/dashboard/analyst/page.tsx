'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  Brain,
  Thermometer,
  Activity,
  AlertTriangle,
  Flame,
  Scale,
  BarChart2,
  Map,
  TrendingUp,
  Database,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

type HubFeature = {
  title: string
  description: string
  href: string
  icon: typeof Brain
}

type HubCategory = {
  id: string
  heading: string
  features: HubFeature[]
}

const CATEGORIES: HubCategory[] = [
  {
    id: 'prediction',
    heading: '🔥 Fire Prediction & Behavior',
    features: [
      {
        title: 'ML Predictor',
        description:
          'Machine learning model predicting fire spread and impact based on terrain and weather',
        href: '/dashboard/analyst/ml',
        icon: Brain,
      },
      {
        title: 'Fire Weather',
        description:
          'Real-time fire weather indices: FWI, wind, humidity, and red flag conditions',
        href: '/dashboard/analyst/fire-weather',
        icon: Thermometer,
      },
      {
        title: 'Fire Patterns',
        description: 'Historical fire pattern analysis by region, season, and terrain type',
        href: '/dashboard/analyst/fire-patterns',
        icon: Activity,
      },
    ],
  },
  {
    id: 'evacuation',
    heading: '🚨 Evacuation & Alert Analysis',
    features: [
      {
        title: 'Signal Gap Analysis',
        description: 'Identify communities with delayed or missing evacuation alerts',
        href: '/dashboard/analyst/signal-gap',
        icon: AlertTriangle,
      },
      {
        title: 'Hidden Danger',
        description: 'Undetected or underreported fire risk zones based on infrastructure gaps',
        href: '/dashboard/analyst/hidden-danger',
        icon: Flame,
      },
    ],
  },
  {
    id: 'equity',
    heading: '📊 Impact & Equity',
    features: [
      {
        title: 'Equity Metrics',
        description: 'Measure disparate wildfire impact across demographic and socioeconomic groups',
        href: '/dashboard/analyst/equity',
        icon: Scale,
      },
      {
        title: 'NRI Analysis',
        description: 'FEMA National Risk Index scores by county — vulnerability and resilience mapping',
        href: '/dashboard/analyst/nri',
        icon: BarChart2,
      },
    ],
  },
  {
    id: 'geo',
    heading: '🗺️ Geospatial & Density',
    features: [
      {
        title: 'Live Fire Map',
        description: 'Real-time active fire locations with perimeter overlays and spread vectors',
        href: '/dashboard/analyst/map',
        icon: Map,
      },
      {
        title: 'Fire Density',
        description: 'Heatmap of fire frequency and intensity by geographic area over time',
        href: '/dashboard/analyst/fire-density',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'trends',
    heading: '📈 Trends & Data Quality',
    features: [
      {
        title: 'Trends',
        description: 'Long-term wildfire trend analysis: frequency, size, seasonality, and climate',
        href: '/dashboard/analyst/trends',
        icon: TrendingUp,
      },
      {
        title: 'Data Health',
        description: 'Monitor data pipeline quality, completeness, and freshness across all sources',
        href: '/dashboard/analyst/data-health',
        icon: Database,
      },
    ],
  },
]

export default function AnalystDashboard() {
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
        /* hide stat */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const quickStats: { label: string; value: string; show: boolean }[] = [
    { label: 'Active fires monitored', value: String(activeFiresCount), show: activeFiresCount != null && activeFiresCount > 0 },
    {
      label: 'Counties covered',
      value: '3,144',
      show: true,
    },
    { label: 'Data sources', value: '9', show: true },
  ]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto text-gray-700 dark:text-gray-300">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
              WildfireAlert Data Intelligence Platform
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Research &amp; Analytics
            </h1>
          </div>
          {headerUpdatedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 shrink-0">
              <RefreshCw className="w-3.5 h-3.5 opacity-70" aria-hidden />
              Hub updated {headerUpdatedAt.toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {quickStats
            .filter(s => s.show)
            .map(s => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 px-4 py-3 min-w-[10rem]"
              >
                <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
                {s.label === 'Active fires monitored' && statsUpdatedAt && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    NIFC snapshot {statsUpdatedAt.toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
        </div>
      </header>

      <div className="space-y-10">
        {CATEGORIES.map(cat => (
          <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
            <h2
              id={`cat-${cat.id}`}
              className="text-sm font-semibold text-gray-900 dark:text-white mb-4 tracking-tight"
            >
              {cat.heading}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.features.map(f => {
                const Icon = f.icon
                return (
                  <Link
                    key={f.href}
                    href={f.href}
                    className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm transition-all hover:border-forest-600/40 dark:hover:border-amber-600/35 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800/90"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-900/80 text-gray-800 dark:text-amber-200/90 border border-gray-200 dark:border-gray-600">
                        <Icon className="w-5 h-5" aria-hidden />
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-forest-600 dark:group-hover:text-amber-400 transition-colors shrink-0 mt-1" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
                      {f.description}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          <span className="font-medium text-gray-800 dark:text-gray-200">Note:</span> Analyses use the enriched WatchDuty-derived dataset
          (50,664 true wildfires after excluding prescribed burns and non-fire location records). See{' '}
          <Link href="/dashboard/analyst/data-health" className="text-forest-700 dark:text-amber-400 underline underline-offset-2">
            Data Health
          </Link>{' '}
          for methodology.
        </p>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { BarChart3, AlertTriangle, Clock, TrendingUp, Database, ArrowRight, Flame, Activity, MapPin } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AnalystDashboard() {
  const [stats, setStats] = useState({
    totalFires: 62696,
    withSignals: 41906,
    withOrders: 108,
    gapRate: 99.74,
  })

  const SECTIONS = [
    {
      title: 'Signal Gap Analysis',
      desc: 'SVI correlation with evacuation delays across states and counties.',
      href: '/dashboard/analyst/signal-gap',
      icon: AlertTriangle,
      color: 'text-signal-danger',
      stat: '99.74% gap rate',
    },
    {
      title: 'Equity Metrics',
      desc: 'CDC SVI cross-analysis: which communities are being left behind.',
      href: '/dashboard/analyst/equity',
      icon: TrendingUp,
      color: 'text-signal-info',
      stat: 'High-SVI counties',
    },
    {
      title: 'ML Fire Predictor',
      desc: 'XGBoost/Random Forest spread predictions with confidence scores.',
      href: '/dashboard/analyst/ml',
      icon: BarChart3,
      color: 'text-amber-400',
      stat: 'XGBoost + RF',
    },
    {
      title: 'Live Fire Map',
      desc: 'NASA FIRMS integration with evacuation zone overlays.',
      href: '/dashboard/analyst/map',
      icon: Database,
      color: 'text-signal-safe',
      stat: 'Real-time FIRMS',
    },
    {
      title: 'Hidden Danger',
      desc: '100 silent fires with extreme radio spread that received zero evacuation action — strongest equity signal in dataset.',
      href: '/dashboard/analyst/hidden-danger',
      icon: Flame,
      color: 'text-signal-danger',
      stat: '100 silent+extreme',
    },
    {
      title: 'Fire Patterns',
      desc: 'Radio dispatch signals, zone escalation skip rates, fire cause analysis, and protocol inversion detection.',
      href: '/dashboard/analyst/fire-patterns',
      icon: Activity,
      color: 'text-amber-400',
      stat: '4 pattern analyses',
    },
    {
      title: 'Fire Density',
      desc: 'Fires per square mile by state. Identifies compound risk: high density + high SVI = most underserved.',
      href: '/dashboard/analyst/fire-density',
      icon: MapPin,
      color: 'text-signal-info',
      stat: '111 fires/1000sqmi CA',
    },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-3">
          <BarChart3 className="w-4 h-4" />
          DATA ANALYST DASHBOARD
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">
          Research Overview
        </h1>
        <p className="text-ash-400 text-lg">
          WiDS Datathon 2025 · WatchDuty Dataset · 62,696 Wildfire Incidents
        </p>
      </div>

      {/* Core stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="card p-5">
          <div className="stat-value text-white">62,696</div>
          <div className="stat-label">Total fire incidents</div>
          <div className="text-ash-600 text-xs mt-0.5">2021–2025</div>
        </div>
        <div className="card p-5">
          <div className="stat-value text-ember-400">41,906</div>
          <div className="stat-label">Fires with signals</div>
          <div className="text-ash-600 text-xs mt-0.5">External detection</div>
        </div>
        <div className="card p-5">
          <div className="stat-value text-signal-danger">108</div>
          <div className="stat-label">With formal orders</div>
          <div className="text-ash-600 text-xs mt-0.5">Of 41,906 signaled</div>
        </div>
        <div className="card p-5">
          <div className="stat-value text-signal-warn">11.5h</div>
          <div className="stat-label">Median delay</div>
          <div className="text-ash-600 text-xs mt-0.5">Signal → formal order</div>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SECTIONS.map(({ title, desc, href, icon: Icon, color, stat }) => (
          <Link
            key={href}
            href={href}
            className="card p-6 hover:bg-ash-800 transition-all duration-200 hover:scale-[1.01] group"
          >
            <div className="flex items-start justify-between mb-4">
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="text-ash-500 text-xs font-mono">{stat}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-ash-400 text-sm mb-4 leading-relaxed">{desc}</p>
            <div className="flex items-center gap-2 text-ash-500 group-hover:text-white transition-colors text-sm">
              Open analysis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Data note */}
      <div className="mt-8 p-4 bg-ash-900/50 border border-ash-800 rounded-lg">
        <p className="text-ash-500 text-xs">
          <span className="text-ash-400 font-medium">Note:</span> The fire_events table contains a known duplicate upload issue (124,696 rows → deduplicated to 62,696 unique incidents). All analyses use deduplicated geo_event_id counts.
        </p>
      </div>
    </div>
  )
}

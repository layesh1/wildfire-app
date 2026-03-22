'use client'
import { useEffect, useState } from 'react'
import { BarChart3, AlertTriangle, Clock, TrendingUp, Database, ArrowRight, Flame, Activity, MapPin, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AnalystDashboard() {
  const [stats, setStats] = useState({
    totalFires: 50664,
    withSignals: 33423,
    withOrders: 653,
    gapRate: 99.3,
  })

  const SECTIONS = [
    {
      title: 'Signal Gap Analysis',
      desc: '99.3% of true wildfires with external signals never received a formal order. SVI predicts whether orders happen, not how long they take.',
      href: '/dashboard/analyst/signal-gap',
      icon: AlertTriangle,
      color: 'text-signal-danger',
      stat: '99.3% gap rate',
    },
    {
      title: 'Data Health',
      desc: 'Prescribed burn filtering, field completeness, known issues, and stat corrections. Start here before any analysis.',
      href: '/dashboard/analyst/data-health',
      icon: ShieldAlert,
      color: 'text-amber-400',
      stat: '17.7% prescribed burns',
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
        <div className="flex items-center gap-2 text-forest-600 text-sm font-medium mb-3">
          <BarChart3 className="w-4 h-4" />
          DATA ANALYST DASHBOARD
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">
          Research Overview
        </h1>
        <p className="text-gray-500 text-lg">
          WiDS Datathon 2026 · WatchDuty Dataset · 60,000+ Wildfire Incidents
        </p>
      </div>

      {/* Core stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="card p-5">
          <div className="stat-value">50,664</div>
          <div className="stat-label">True wildfire incidents</div>
          <div className="text-gray-400 text-xs mt-0.5">62,696 total; 11,115 prescribed burns excluded</div>
        </div>
        <div className="card p-5">
          <div className="stat-value text-forest-600">33,423</div>
          <div className="stat-label">Fires with signals</div>
          <div className="text-gray-400 text-xs mt-0.5">External detection</div>
        </div>
        <div className="card p-5">
          <div className="stat-value text-signal-danger">653</div>
          <div className="stat-label">With formal orders</div>
          <div className="text-gray-400 text-xs mt-0.5">Of 33,423 signaled (99.3% gap)</div>
        </div>
        <div className="card p-5">
          <div className="stat-value text-signal-warn">4.1h</div>
          <div className="stat-label">Signal lead time</div>
          <div className="text-gray-400 text-xs mt-0.5">Median: signal → order (n=242)</div>
        </div>
      </div>

      {/* Section cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SECTIONS.map(({ title, desc, href, icon: Icon, color, stat }) => (
          <Link
            key={href}
            href={href}
            className="card p-6 hover:bg-gray-50 transition-all duration-200 hover:scale-[1.01] group"
          >
            <div className="flex items-start justify-between mb-4">
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="text-gray-400 text-xs font-mono">{stat}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">{desc}</p>
            <div className="flex items-center gap-2 text-gray-400 group-hover:text-forest-600 transition-colors text-sm">
              Open analysis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Data note */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500 text-xs">
          <span className="text-gray-600 font-medium">Note:</span> The fire_events table contains a known duplicate upload issue (124,696 rows → deduplicated to 62,696 unique incidents). Of those, 11,115 are prescribed burns (17.7%) and 917 are location records — true wildfire count is 50,664. All analyses filter to <code className="text-gray-600">is_true_wildfire=1</code>.
        </p>
      </div>
    </div>
  )
}

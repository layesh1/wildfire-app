'use client'
import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, MapPin, Users, Clock } from 'lucide-react'

const COVERAGE_DATA = [
  { region: 'Los Angeles County, CA', status: 'covered', agencies: 12, response_time: 8, population: 10014009, svi: 0.61 },
  { region: 'San Bernardino County, CA', status: 'gap', agencies: 4, response_time: 34, population: 2181654, svi: 0.72 },
  { region: 'Riverside County, CA', status: 'partial', agencies: 6, response_time: 22, population: 2418185, svi: 0.68 },
  { region: 'Ventura County, CA', status: 'covered', agencies: 8, response_time: 11, population: 843843, svi: 0.44 },
  { region: 'Maricopa County, AZ', status: 'partial', agencies: 9, response_time: 19, population: 4420568, svi: 0.57 },
  { region: 'Pinal County, AZ', status: 'gap', agencies: 2, response_time: 47, population: 411923, svi: 0.79 },
  { region: 'King County, WA', status: 'covered', agencies: 14, response_time: 7, population: 2252782, svi: 0.38 },
  { region: 'Chelan County, WA', status: 'gap', agencies: 1, response_time: 62, population: 77200, svi: 0.71 },
  { region: 'Larimer County, CO', status: 'partial', agencies: 5, response_time: 25, population: 359066, svi: 0.42 },
  { region: 'Jefferson County, MT', status: 'gap', agencies: 1, response_time: 78, population: 12085, svi: 0.65 },
]

const STATUS_CONFIG = {
  covered: { label: 'Covered', color: 'text-signal-safe', badge: 'badge-safe', icon: CheckCircle },
  partial: { label: 'Partial Gap', color: 'text-signal-warn', badge: 'badge-warn', icon: AlertTriangle },
  gap: { label: 'Critical Gap', color: 'text-signal-danger', badge: 'badge-danger', icon: XCircle },
}

export default function AgencyCoveragePage() {
  const [filter, setFilter] = useState<'all' | 'gap' | 'partial'>('all')

  const filtered = filter === 'all' ? COVERAGE_DATA : COVERAGE_DATA.filter(r => r.status === filter || (filter === 'gap' && r.status === 'partial'))
  const gaps = COVERAGE_DATA.filter(r => r.status === 'gap').length
  const partial = COVERAGE_DATA.filter(r => r.status === 'partial').length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-signal-warn text-sm font-medium mb-3">
          <Shield className="w-4 h-4" /> AGENCY COVERAGE
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Agency Coverage Map</h1>
        <p className="text-ash-400 text-sm">Emergency response agency coverage by county. Gaps indicate areas with insufficient resources for wildfire response.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="font-display text-3xl font-bold text-signal-danger">{gaps}</div>
          <div className="text-ash-400 text-sm mt-1">Critical gaps</div>
        </div>
        <div className="card p-5">
          <div className="font-display text-3xl font-bold text-signal-warn">{partial}</div>
          <div className="text-ash-400 text-sm mt-1">Partial coverage</div>
        </div>
        <div className="card p-5">
          <div className="font-display text-3xl font-bold text-ember-400">62 min</div>
          <div className="text-ash-400 text-sm mt-1">Max response time</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'gap', 'partial'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-ash-700 border-ash-600 text-white' : 'border-ash-800 text-ash-400 hover:text-white hover:border-ash-700'}`}>
            {f === 'all' ? 'All regions' : f === 'gap' ? 'Gaps only' : 'Partial only'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ash-800 text-left">
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Region</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Agencies</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">Response Time</th>
              <th className="px-5 py-3 text-ash-400 text-xs font-medium uppercase tracking-wider">SVI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ash-800">
            {filtered.map((row, i) => {
              const cfg = STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG]
              const Icon = cfg.icon
              return (
                <tr key={i} className="hover:bg-ash-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-ash-600 shrink-0" />
                      <span className="text-white text-sm font-medium">{row.region}</span>
                    </div>
                    <div className="text-ash-600 text-xs mt-0.5 pl-5">{row.population.toLocaleString()} residents</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span className={cfg.badge}>{cfg.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-ash-600" />
                      <span className="text-ash-300 text-sm">{row.agencies}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-ash-600" />
                      <span className={`text-sm font-mono font-bold ${row.response_time > 40 ? 'text-signal-danger' : row.response_time > 20 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                        {row.response_time} min
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-mono ${row.svi > 0.7 ? 'text-signal-danger' : row.svi > 0.5 ? 'text-signal-warn' : 'text-signal-safe'}`}>
                      {row.svi.toFixed(2)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, Home, ArrowRight, HelpCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Status = 'evacuated' | 'sheltering' | 'returning' | 'unknown'

const STATUS_OPTIONS: {
  value: Status
  label: string
  icon: any
  activeClass: string
  desc: string
}[] = [
  {
    value: 'evacuated',
    label: 'Evacuated — I am safe',
    icon: CheckCircle,
    activeClass: 'bg-signal-safe/10 border-signal-safe/40 text-signal-safe',
    desc: 'I have left the area and am in a safe location.',
  },
  {
    value: 'sheltering',
    label: 'Sheltering in place',
    icon: Home,
    activeClass: 'bg-signal-info/10 border-signal-info/40 text-signal-info',
    desc: 'I am staying where I am and monitoring the situation.',
  },
  {
    value: 'returning',
    label: 'Returning home',
    icon: ArrowRight,
    activeClass: 'bg-signal-warn/10 border-signal-warn/40 text-signal-warn',
    desc: 'The immediate danger has passed and I am heading back.',
  },
  {
    value: 'unknown',
    label: 'Need help / Unknown',
    icon: HelpCircle,
    activeClass: 'bg-signal-danger/10 border-signal-danger/40 text-signal-danger',
    desc: 'I need assistance or my situation is unclear.',
  },
]

export default function CheckInPage() {
  const [currentStatus, setCurrentStatus] = useState<Status | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const [locationName, setLocationName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [recentCheckins, setRecentCheckins] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const { data: record } = await supabase
        .from('evacuee_records')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (record) {
        setCurrentStatus(record.status)
        setSelectedStatus(record.status)
        setLocationName(record.location_name || '')
        setLastUpdated(record.updated_at)
      }

      const { data: recent } = await supabase
        .from('evacuee_records')
        .select('status, location_name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10)

      if (recent) setRecentCheckins(recent)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!selectedStatus || !userId) return
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('evacuee_records')
      .upsert(
        {
          user_id: userId,
          status: selectedStatus,
          location_name: locationName || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (!error) {
      setCurrentStatus(selectedStatus)
      setLastUpdated(new Date().toISOString())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const currentOption = STATUS_OPTIONS.find(o => o.value === currentStatus)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
          <CheckCircle className="w-4 h-4" />
          CAREGIVER · CHECK-IN
        </div>
        <h1 className="font-display text-4xl font-bold text-white mb-3">Safety Check-In</h1>
        <p className="text-ash-400">
          Let emergency services and loved ones know you're safe. Update your status as your situation changes.
        </p>
      </div>

      {/* Current status banner */}
      {!loading && currentStatus && currentOption && (
        <div className={`rounded-xl p-5 border flex items-center gap-4 mb-8 ${currentOption.activeClass}`}>
          <currentOption.icon className="w-6 h-6 shrink-0" />
          <div>
            <div className="font-semibold text-white">{currentOption.label}</div>
            {lastUpdated && (
              <div className="text-xs text-ash-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Updated {new Date(lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status picker */}
      <div className="mb-6">
        <h2 className="text-white font-semibold mb-4">Update your status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STATUS_OPTIONS.map(({ value, label, icon: Icon, activeClass, desc }) => (
            <button
              key={value}
              onClick={() => setSelectedStatus(value)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedStatus === value
                  ? activeClass
                  : 'bg-ash-900 border-ash-800 hover:border-ash-700 hover:bg-ash-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 shrink-0 ${selectedStatus === value ? '' : 'text-ash-400'}`} />
                <span className={`text-sm font-medium ${selectedStatus === value ? 'text-white' : 'text-ash-300'}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-ash-500 pl-6">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Location input */}
      <div className="mb-6">
        <label className="block text-ash-300 text-sm font-medium mb-2">
          Location / shelter name <span className="text-ash-600">(optional)</span>
        </label>
        <input
          type="text"
          value={locationName}
          onChange={e => setLocationName(e.target.value)}
          placeholder="e.g. Red Cross Shelter — Pasadena High School"
          className="w-full bg-ash-900 border border-ash-700 rounded-xl px-4 py-3 text-white placeholder-ash-600 text-sm focus:outline-none focus:border-ash-500 transition-colors"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!selectedStatus || saving}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-ember-500 hover:bg-ember-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : saved ? '✓ Status updated' : 'Update My Status'}
      </button>

      {/* Community check-ins */}
      {recentCheckins.length > 0 && (
        <div className="mt-10">
          <h2 className="section-title mb-4">Recent Community Check-Ins</h2>
          <div className="card divide-y divide-ash-800">
            {recentCheckins.map((record, i) => {
              const opt = STATUS_OPTIONS.find(o => o.value === record.status)
              return (
                <div key={i} className="p-4 flex items-center gap-3">
                  {opt && (
                    <opt.icon className={`w-4 h-4 shrink-0 ${opt.activeClass.split(' ')[2]}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{opt?.label || record.status}</div>
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
    </div>
  )
}

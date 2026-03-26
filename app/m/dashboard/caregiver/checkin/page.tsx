'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, Home, ArrowRight, HelpCircle, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { loadCheckinStatus, saveCheckinStatus } from '@/lib/user-data'

type Status = 'evacuated' | 'sheltering' | 'returning' | 'unknown'

const OPTIONS: { value: Status; label: string; desc: string; icon: any; border: string; bg: string; text: string }[] = [
  {
    value: 'evacuated',
    label: 'Evacuated — I am safe',
    desc: 'I have left the area and am in a safe location.',
    icon: CheckCircle,
    border: '#16a34a',
    bg: '#f0fdf4',
    text: '#15803d',
  },
  {
    value: 'sheltering',
    label: 'Sheltering in place',
    desc: 'Staying inside. Close windows, turn off HVAC, monitor alerts.',
    icon: Home,
    border: '#3b82f6',
    bg: '#eff6ff',
    text: '#1d4ed8',
  },
  {
    value: 'returning',
    label: 'Returning home',
    desc: 'Danger has passed and I am heading back.',
    icon: ArrowRight,
    border: '#d97706',
    bg: '#fffbeb',
    text: '#b45309',
  },
  {
    value: 'unknown',
    label: 'Need help / Unknown',
    desc: 'I am not sure of my situation or need assistance.',
    icon: HelpCircle,
    border: '#dc2626',
    bg: '#fef2f2',
    text: '#b91c1c',
  },
]

export default function MobileCheckinPage() {
  const [selected, setSelected] = useState<Status | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    try {
      const card = JSON.parse(localStorage.getItem('wfa_emergency_card') || '{}')
      if (card.full_name) setUserName(card.full_name.split(' ')[0])
    } catch {}
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const status = await loadCheckinStatus(supabase, data.user.id)
        if (status) setSelected(status as Status)
      } else {
        try {
          const prev = localStorage.getItem('wfa_checkin_status')
          if (prev) setSelected(prev as Status)
        } catch {}
      }
    }).catch(() => {
      try {
        const prev = localStorage.getItem('wfa_checkin_status')
        if (prev) setSelected(prev as Status)
      } catch {}
    })
  }, [])

  async function submit() {
    if (!selected) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await saveCheckinStatus(supabase, user.id, selected)
      } else {
        localStorage.setItem('wfa_checkin_status', selected)
      }
    } catch {}
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-full">
      <div className="px-4 pt-10 pb-5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 text-green-700 text-xs font-semibold uppercase tracking-widest mb-1">
          <CheckCircle className="w-3.5 h-3.5" /> Check In
        </div>
        <h1 className="font-display font-bold text-2xl text-gray-900">
          {userName ? `${userName}, how are you?` : 'How are you?'}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Let your caregivers know your current status.</p>
      </div>

      <div className="px-4 py-5 space-y-3">
        {OPTIONS.map(opt => {
          const Icon = opt.icon
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className="w-full text-left rounded-2xl p-4 border-2 transition-all"
              style={active
                ? { borderColor: opt.border, background: opt.bg }
                : { borderColor: '#e5e7eb', background: '#fff' }}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0" style={{ color: active ? opt.border : '#9ca3af' }} />
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: active ? opt.text : '#111827' }}>
                    {opt.label}
                  </div>
                  {active && <div className="text-xs mt-0.5" style={{ color: opt.text + 'cc' }}>{opt.desc}</div>}
                </div>
                {active && <CheckCircle className="w-4 h-4 shrink-0" style={{ color: opt.border }} />}
              </div>
            </button>
          )
        })}

        {saved && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
            <CheckCircle className="w-4 h-4" /> Status saved!
          </div>
        )}

        <button
          onClick={submit}
          disabled={!selected || saving}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm disabled:opacity-40 transition-all"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
        >
          {saving ? 'Saving…' : 'Confirm My Status'}
        </button>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Always follow official evacuation orders from local authorities. Call 911 in emergencies.</p>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Map, Heart, CheckCircle, LayoutDashboard, Shield, BarChart3 } from 'lucide-react'

export type Chip = { href: string; label: string }

const ICONS: Record<string, typeof Map> = {
  map: Map,
  shelter: Heart,
  checkin: CheckCircle,
  ics: Shield,
  hub: LayoutDashboard,
  analytics: BarChart3,
}

function iconFor(label: string) {
  const l = label.toLowerCase()
  if (l.includes('ics')) return ICONS.ics
  if (l.includes('analytics') || l.includes('command analytics')) return ICONS.analytics
  if (l.includes('hub') && l.includes('command')) return ICONS.hub
  if (l.includes('check')) return ICONS.checkin
  if (l.includes('shelter')) return ICONS.shelter
  return ICONS.map
}

export function FlameoActionChips({
  chips,
  variant = 'light',
}: {
  chips: Chip[]
  variant?: 'light' | 'dark'
}) {
  if (!chips.length) return null
  const isDark = variant === 'dark'
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map(c => {
        const Icon = iconFor(c.label)
        return (
          <Link
            key={c.href + c.label}
            href={c.href}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition-colors ${
              isDark
                ? 'bg-signal-info/15 border-signal-info/40 text-signal-info hover:bg-signal-info/25'
                : 'bg-forest-50 border-forest-200 text-forest-800 hover:bg-forest-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {c.label}
          </Link>
        )
      })}
    </div>
  )
}

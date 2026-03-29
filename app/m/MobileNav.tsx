'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Settings, Shield, Map, CheckCircle, Activity, Zap } from 'lucide-react'

const CAREGIVER_TABS = [
  { href: '/m/dashboard/caregiver', icon: Home, label: 'Hub' },
  { href: '/m/dashboard/caregiver/ai', icon: Activity, label: 'Flameo' },
  { href: '/m/dashboard/caregiver/map', icon: Map, label: 'Map' },
  { href: '/m/dashboard/caregiver/checkin', icon: CheckCircle, label: 'Check-in' },
  { href: '/m/dashboard/settings', icon: Settings, label: 'Settings' },
]

const EVACUEE_TABS = [
  { href: '/m/dashboard/evacuee', icon: Home, label: 'Hub' },
  { href: '/m/dashboard/evacuee/ai', icon: Activity, label: 'Flameo' },
  { href: '/m/dashboard/evacuee/map', icon: Map, label: 'Map' },
  { href: '/m/dashboard/evacuee/checkin', icon: CheckCircle, label: 'Check-in' },
  { href: '/m/dashboard/settings', icon: Settings, label: 'Settings' },
]

const RESPONDER_TABS = [
  { href: '/m/dashboard/responder', icon: Shield, label: 'Command' },
  { href: '/m/dashboard/responder/alerts', icon: Activity, label: 'Alerts' },
  { href: '/m/dashboard/responder/ai', icon: Zap, label: 'INTEL' },
  { href: '/m/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function MobileNav({ role }: { role: string }) {
  const pathname = usePathname()
  const tabs =
    role === 'emergency_responder'
      ? RESPONDER_TABS
      : role === 'evacuee'
        ? EVACUEE_TABS
        : CAREGIVER_TABS

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 1000 }}
    >
      {tabs.map(tab => {
        const active =
          pathname === tab.href || pathname?.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-w-0 transition-colors"
            style={{ color: active ? '#16a34a' : '#9ca3af' }}
          >
            <tab.icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[9px] font-semibold tracking-wide truncate max-w-full px-0.5">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

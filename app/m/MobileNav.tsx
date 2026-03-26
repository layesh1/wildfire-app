'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Map, Users, Settings, Shield } from 'lucide-react'

const CAREGIVER_TABS = [
  { href: '/m/dashboard/caregiver',         icon: Home,     label: 'Hub'      },
  { href: '/m/dashboard/caregiver/map',     icon: Map,      label: 'Map'      },
  { href: '/m/dashboard/caregiver/persons', icon: Users,    label: 'Persons'  },
  { href: '/m/dashboard/settings',          icon: Settings, label: 'Settings' },
]

const RESPONDER_TABS = [
  { href: '/m/dashboard/responder',         icon: Shield,   label: 'Command'  },
  { href: '/m/dashboard/caregiver/map',     icon: Map,      label: 'Map'      },
  { href: '/m/dashboard/settings',          icon: Settings, label: 'Settings' },
]

export default function MobileNav({ role }: { role: string }) {
  const pathname = usePathname()
  const tabs = role === 'emergency_responder' ? RESPONDER_TABS : CAREGIVER_TABS

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 1000 }}
    >
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
            style={{ color: active ? '#16a34a' : '#9ca3af' }}
          >
            <tab.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

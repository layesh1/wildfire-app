'use client'
import { usePathname } from 'next/navigation'
import RoleContextBar from '@/components/RoleContextBar'

// Pages where text-white should become dark green in light mode.
// Excludes My Hub (/dashboard/caregiver) and Ask FlameoAI (/dashboard/caregiver/ai).
const CONTENT_PAGES = [
  '/dashboard/caregiver/persons',
  '/dashboard/caregiver/alert',
  '/dashboard/caregiver/checkin',
  '/dashboard/caregiver/emergency-card',
  '/dashboard/caregiver/map',
  '/dashboard/settings',
]

// Caregiver pages that show the role context bar
const CAREGIVER_PAGES = [
  '/dashboard/caregiver',
]

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isContentPage = CONTENT_PAGES.some(p => pathname?.startsWith(p))
  const showContextBar = pathname?.startsWith('/dashboard/caregiver') || isContentPage

  return (
    <main className={`flex-1 overflow-auto flex flex-col${isContentPage ? ' wfa-content-page' : ''}`}>
      {showContextBar && <RoleContextBar />}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </main>
  )
}

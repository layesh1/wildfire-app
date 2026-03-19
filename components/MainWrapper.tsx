'use client'
import { usePathname } from 'next/navigation'

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

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isContentPage = CONTENT_PAGES.some(p => pathname?.startsWith(p))
  return (
    <main className={`flex-1 overflow-auto${isContentPage ? ' wfa-content-page' : ''}`}>
      {children}
    </main>
  )
}

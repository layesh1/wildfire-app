'use client'
import { usePathname } from 'next/navigation'
import RoleContextBar from '@/components/RoleContextBar'
import { isFlameoDashboardAiFullScreenPath } from '@/lib/flameo-ai-fullscreen-routes'

// Pages where text-white should become dark green in light mode.
// Consumer hub and subpages use unified styling (canonical /dashboard/home).
const CONTENT_PAGES = [
  '/dashboard/caregiver/persons',
  '/dashboard/caregiver/checkin',
  '/dashboard/caregiver/emergency-card',
  '/dashboard/caregiver/map',
  '/dashboard/caregiver/ai',
  '/dashboard/home',
  '/dashboard/home/map',
  '/dashboard/home/checkin',
  '/dashboard/home/ai',
  '/dashboard/home/persons',
  '/dashboard/home/emergency-card',
  '/dashboard/evacuee/map',
  '/dashboard/evacuee/checkin',
  '/dashboard/evacuee/ai',
  '/dashboard/settings',
]

// Pages that show the role context bar (not the unified home hub)
const CAREGIVER_PAGES = [
  '/dashboard/caregiver',
]

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isResponderSection =
    pathname?.startsWith('/dashboard/responder') || pathname?.startsWith('/m/dashboard/responder')
  const isEvacueeHub =
    pathname?.startsWith('/dashboard/evacuee') ||
    pathname?.startsWith('/m/dashboard/evacuee') ||
    pathname?.startsWith('/dashboard/home') ||
    pathname?.startsWith('/m/dashboard/home')
  const isContentPage = CONTENT_PAGES.some(p => pathname?.startsWith(p)) || isResponderSection
  const flameoAiFullScreen = isFlameoDashboardAiFullScreenPath(pathname)
  const showContextBar =
    !flameoAiFullScreen &&
    !isEvacueeHub &&
    !isResponderSection &&
    (pathname?.startsWith('/dashboard/caregiver') ||
      pathname?.startsWith('/m/dashboard/caregiver') ||
      isContentPage)
  return (
    <main
      className={`relative flex min-h-0 min-w-0 w-full flex-1 flex-col lg:pl-16${isContentPage ? ' wfa-content-page' : ''}${
        flameoAiFullScreen ? ' max-h-[100dvh] min-h-0 overflow-hidden' : ''
      }`}
    >
      {showContextBar && <RoleContextBar />}
      {/* No overflow-y on this shell so the row in ThemeWrapper can grow with tall pages; sidebar stretches via items-stretch + min-h-full */}
      <div
        className={`flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden${
          flameoAiFullScreen ? ' min-h-0 overflow-hidden' : ''
        }`}
      >
        {children}
      </div>
    </main>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import MobileNav from '@/app/m/MobileNav'
import MobileFlameo from '@/app/m/MobileFlameo'
import { isFlameoDashboardAiFullScreenPath } from '@/lib/flameo-ai-fullscreen-routes'

export default function MobileAppShell({
  children,
  role,
}: {
  children: React.ReactNode
  role: string
}) {
  const pathname = usePathname()
  const fullBleedAi = isFlameoDashboardAiFullScreenPath(pathname)

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50 text-gray-900">
      <main
        className={
          fullBleedAi
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'flex-1 overflow-y-auto pb-20'
        }
      >
        {children}
      </main>
      {!fullBleedAi && <MobileNav role={role} />}
      {!fullBleedAi && <MobileFlameo />}
    </div>
  )
}

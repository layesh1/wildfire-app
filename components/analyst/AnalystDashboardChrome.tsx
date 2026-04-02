'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ANALYST_MAIN_TABS, getAnalystMainTabId } from '@/lib/analyst-dashboard-nav'

function tabButtonClass(active: boolean) {
  return cn(
    'shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors border',
    active
      ? 'border-forest-600/50 bg-forest-50 text-forest-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100'
      : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
  )
}

export default function AnalystDashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const mainId = getAnalystMainTabId(pathname)
  const mainTab = ANALYST_MAIN_TABS.find(t => t.id === mainId) ?? ANALYST_MAIN_TABS[0]
  const subs = mainTab.sub

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--wfa-page-bg,#f9fafb)] dark:bg-[var(--wfa-page-bg)]">
      <div className="shrink-0 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Data analyst
            </p>
            <h1 className="font-display text-lg font-bold text-gray-900 dark:text-white md:text-xl">
              Research &amp; analytics
            </h1>
          </div>
          <Link
            href="/dashboard/settings?role=data_analyst"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
            Settings
          </Link>
        </div>

        <nav
          className="mx-auto mt-3 flex max-w-7xl gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Analyst main sections"
        >
          {ANALYST_MAIN_TABS.map(tab => {
            const active = tab.id === mainId
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={tabButtonClass(active)}
              >
                <span className="whitespace-nowrap">
                  {tab.emoji ? `${tab.emoji} ` : ''}
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {subs.length > 0 && (
          <nav
            className="mx-auto mt-2 flex max-w-7xl flex-wrap gap-1.5 border-t border-gray-100 pt-2 dark:border-gray-800/80"
            aria-label="Section tools"
          >
            {subs.map(s => {
              const active =
                pathname === s.href || pathname.startsWith(`${s.href}/`)
              const Icon = s.icon
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-gray-900 text-white dark:bg-amber-600/90 dark:text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                  {s.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  )
}

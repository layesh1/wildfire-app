'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'dark' | 'light' | 'system'

function resolveDark(t: Theme): boolean {
  if (t === 'dark') return true
  if (t === 'light') return false
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function DashboardThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    setTheme(((typeof window !== 'undefined' && localStorage.getItem('wfa_theme')) as Theme) || 'light')
    function onChange(e: Event) {
      setTheme((e as CustomEvent<string>).detail as Theme)
    }
    window.addEventListener('wfa-theme-change', onChange)
    return () => window.removeEventListener('wfa-theme-change', onChange)
  }, [])

  function cycle() {
    const order: Theme[] = ['light', 'dark', 'system']
    const i = order.indexOf(theme)
    const next = order[(i + 1) % order.length]
    localStorage.setItem('wfa_theme', next)
    window.dispatchEvent(new CustomEvent('wfa-theme-change', { detail: next }))
    setTheme(next)
    const dark = resolveDark(next)
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${label} (click to cycle)`}
      aria-label={`Theme: ${label}. Click to cycle light, dark, and system.`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
        'border-[var(--wfa-border)] bg-[var(--wfa-panel-solid)] text-[var(--wfa-text)]',
        'hover:bg-[var(--wfa-accent-lite-bg)] hover:border-[var(--wfa-accent-lite-bdr)]',
        'shadow-sm shrink-0',
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
      <span className="hidden sm:inline tabular-nums">{label}</span>
    </button>
  )
}

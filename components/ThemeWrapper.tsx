'use client'
import { useEffect, useState } from 'react'
import { RoleProvider } from '@/components/RoleContext'

function resolveTheme(saved: string | null): boolean {
  if (saved === 'dark') return true
  if (saved === 'light') return false
  // system: follow OS preference
  if (saved === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('wfa_theme') || 'light'
    const dark = resolveTheme(saved)
    setIsDark(dark)
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    function handleThemeChange(e: Event) {
      const theme = (e as CustomEvent<string>).detail
      const nextDark = resolveTheme(theme)
      setIsDark(nextDark)
      if (nextDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    // Also listen for system preference changes when theme is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    function handleSystemChange() {
      const current = localStorage.getItem('wfa_theme') || 'light'
      if (current === 'system') {
        const nextDark = mediaQuery.matches
        setIsDark(nextDark)
        if (nextDark) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      }
    }

    window.addEventListener('wfa-theme-change', handleThemeChange)
    mediaQuery.addEventListener('change', handleSystemChange)
    return () => {
      window.removeEventListener('wfa-theme-change', handleThemeChange)
      mediaQuery.removeEventListener('change', handleSystemChange)
    }
  }, [])

  return (
    <RoleProvider>
      <div
        className={`flex min-h-[100dvh] w-full min-w-0 flex-row items-stretch overflow-x-hidden ${isDark ? '' : 'light-theme'}`}
      >
        {children}
      </div>
    </RoleProvider>
  )
}

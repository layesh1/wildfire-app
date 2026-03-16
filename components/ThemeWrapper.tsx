'use client'
import { useEffect, useState } from 'react'

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    function applyStored() {
      const t = localStorage.getItem('wfa_theme') || 'light'
      if (t === 'dark') {
        setIsDark(true)
      } else if (t === 'system') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      } else {
        setIsDark(false)
      }
    }

    applyStored()

    // Listen for theme changes dispatched by settings page
    window.addEventListener('wfa-theme-change', applyStored)

    // Also handle system preference changes when mode is 'system'
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const mqHandler = () => {
      if (localStorage.getItem('wfa_theme') === 'system') applyStored()
    }
    mq.addEventListener('change', mqHandler)

    return () => {
      window.removeEventListener('wfa-theme-change', applyStored)
      mq.removeEventListener('change', mqHandler)
    }
  }, [])

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-ash-950' : 'bg-gray-50 light-theme'}`}>
      {children}
    </div>
  )
}

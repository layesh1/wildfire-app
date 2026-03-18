'use client'
import { useEffect, useState } from 'react'

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  function applyDark(dark: boolean) {
    setIsDark(dark)
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    function applyStored() {
      const t = localStorage.getItem('wfa_theme') || 'light'
      if (t === 'dark') {
        applyDark(true)
      } else if (t === 'system') {
        applyDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      } else {
        applyDark(false)
      }
    }

    applyStored()
    window.addEventListener('wfa-theme-change', applyStored)

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
    <div className={`min-h-screen flex ${isDark ? 'bg-gray-950' : 'bg-gray-50 light-theme'}`}>
      {children}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('wfa_theme') || 'light'
    const dark = saved === 'dark'
    setIsDark(dark)
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    function handleThemeChange(e: Event) {
      const theme = (e as CustomEvent<string>).detail
      const nextDark = theme === 'dark'
      setIsDark(nextDark)
      if (nextDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    window.addEventListener('wfa-theme-change', handleThemeChange)
    return () => window.removeEventListener('wfa-theme-change', handleThemeChange)
  }, [])

  return (
    <div className={`min-h-screen flex ${isDark ? '' : 'light-theme'}`}>
      {children}
    </div>
  )
}

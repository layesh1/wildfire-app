'use client'
import { useEffect } from 'react'

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved theme on mount
    const saved = localStorage.getItem('wfa_theme') || 'light'
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Listen for theme changes dispatched by the settings page
    function handleThemeChange(e: Event) {
      const theme = (e as CustomEvent<string>).detail
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    window.addEventListener('wfa-theme-change', handleThemeChange)
    return () => window.removeEventListener('wfa-theme-change', handleThemeChange)
  }, [])

  return (
    <div className="min-h-screen flex">
      {children}
    </div>
  )
}

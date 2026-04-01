'use client'
import { User, Shield } from 'lucide-react'
import { useRoleContext } from '@/components/RoleContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function RoleContextBar() {
  const { mode, activePerson } = useRoleContext()

  if (mode === 'self' || !activePerson) {
    return (
      <div
        className="flex items-center gap-3 border-b border-green-200/60 bg-green-100/40 px-4 py-2 text-sm font-medium text-green-900 dark:border-green-900/40 dark:bg-green-950/35 dark:text-green-100"
      >
        <Shield className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 leading-snug">
          My Hub — maps and Flameo use your saved home (and your live location when shared)
        </p>
        <LanguageSwitcher
          menuButtonClassName="border-green-300/80 bg-white/70 text-green-900 hover:bg-white dark:border-green-800 dark:bg-green-900/50 dark:text-green-50 dark:hover:bg-green-900/70"
        />
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 border-b border-amber-200/70 bg-amber-50/80 px-4 py-2 text-sm font-medium text-amber-950 dark:border-amber-900/35 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <User className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-snug">
        Viewing <span className="mx-1 font-bold">{activePerson.name}</span>
        {activePerson.address ? (
          <span className="text-amber-900/70 dark:text-amber-200/80">· map &amp; alerts use their address</span>
        ) : null}
      </p>
      <LanguageSwitcher
        menuButtonClassName="border-amber-300/80 bg-white/80 text-amber-950 hover:bg-white dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-950/70"
      />
    </div>
  )
}

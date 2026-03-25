'use client'
import { useRoleContext } from '@/components/RoleContext'
import { User } from 'lucide-react'

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const { mode, activePerson } = useRoleContext()
  const isCaregiverMode = mode === 'caregiver' && activePerson !== null

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {isCaregiverMode && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-amber-600/90 shrink-0">
          <User className="w-3.5 h-3.5" />
          Viewing as caregiver for <span className="font-semibold">{activePerson.name}</span>
          {activePerson.relationship && (
            <span className="opacity-70">· {activePerson.relationship}</span>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </main>
  )
}

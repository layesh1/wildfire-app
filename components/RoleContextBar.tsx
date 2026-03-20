'use client'
import { User, Shield } from 'lucide-react'
import { useRoleContext } from '@/components/RoleContext'

export default function RoleContextBar() {
  const { mode, activePerson } = useRoleContext()

  if (mode === 'self') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-b"
        style={{ background: 'rgba(124,179,66,0.1)', borderColor: 'rgba(124,179,66,0.2)', color: '#4a7c2f' }}>
        <Shield className="w-3.5 h-3.5 shrink-0" />
        My Safety — alerts and data shown for you
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-b"
      style={{ background: 'rgba(200,100,50,0.1)', borderColor: 'rgba(200,100,50,0.25)', color: '#c86432' }}>
      <User className="w-3.5 h-3.5 shrink-0" />
      {activePerson
        ? <>Caring for <span className="font-bold mx-1">{activePerson.name}</span>{activePerson.address ? `· ${activePerson.address}` : ''}</>
        : 'Caregiver mode — select a person in the sidebar'}
    </div>
  )
}

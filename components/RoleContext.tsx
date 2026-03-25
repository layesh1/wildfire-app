'use client'
import { createContext, useContext, useState, useEffect } from 'react'

export interface RolePerson {
  id: string
  name: string
  address?: string
  relationship?: string
  mobility?: string
}

interface RoleContextValue {
  mode: 'self' | 'caregiver'
  setMode: (m: 'self' | 'caregiver') => void
  activePerson: RolePerson | null
  setActivePerson: (p: RolePerson | null) => void
  persons: RolePerson[]
}

const RoleContext = createContext<RoleContextValue>({
  mode: 'self',
  setMode: () => {},
  activePerson: null,
  setActivePerson: () => {},
  persons: [],
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<'self' | 'caregiver'>('self')
  const [activePerson, setActivePersonState] = useState<RolePerson | null>(null)
  const [persons, setPersons] = useState<RolePerson[]>([])

  // Load persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('monitored_persons_v2')
      const loaded: RolePerson[] = raw ? JSON.parse(raw) : []
      setPersons(loaded)

      const savedMode = localStorage.getItem('wfa_role_mode') as 'self' | 'caregiver' | null
      const savedId = localStorage.getItem('wfa_active_person_id')

      if (savedMode === 'caregiver' && savedId && loaded.length > 0) {
        const found = loaded.find(p => p.id === savedId) ?? null
        setActivePersonState(found)
        setModeState(found ? 'caregiver' : 'self')
      } else if (savedMode === 'self') {
        setModeState('self')
      }
    } catch {}
  }, [])

  function setMode(m: 'self' | 'caregiver') {
    setModeState(m)
    localStorage.setItem('wfa_role_mode', m)
  }

  function setActivePerson(p: RolePerson | null) {
    setActivePersonState(p)
    localStorage.setItem('wfa_active_person_id', p?.id ?? '')
  }

  return (
    <RoleContext.Provider value={{ mode, setMode, activePerson, setActivePerson, persons }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRoleContext() {
  return useContext(RoleContext)
}

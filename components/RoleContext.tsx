'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

/** `member` = focusing map/Flameo on someone in My People (no separate “caregiver” product role). */
export type RoleMode = 'self' | 'member'

export interface RolePerson {
  id: string
  name: string
  address?: string
  phone?: string
  relationship?: string
  mobility?: string
}

interface RoleContextValue {
  mode: RoleMode
  activePerson: RolePerson | null
  persons: RolePerson[]
  setMode: (mode: RoleMode) => void
  setActivePerson: (person: RolePerson | null) => void
}

const RoleContext = createContext<RoleContextValue>({
  mode: 'self',
  activePerson: null,
  persons: [],
  setMode: () => {},
  setActivePerson: () => {},
})

export function useRoleContext() {
  return useContext(RoleContext)
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<RoleMode>('self')
  const [activePerson, setActivePersonState] = useState<RolePerson | null>(null)
  const [persons, setPersons] = useState<RolePerson[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('monitored_persons_v2')
      if (raw) setPersons(JSON.parse(raw))
    } catch {}

    const savedMode = localStorage.getItem('wfa_role_mode') as string | null
    if (savedMode === 'self') setModeState('self')
    else if (savedMode === 'member' || savedMode === 'caregiver') setModeState('member')

    const savedPersonId = localStorage.getItem('wfa_active_person_id')
    if (savedPersonId) {
      try {
        const raw = localStorage.getItem('monitored_persons_v2')
        const list: RolePerson[] = raw ? JSON.parse(raw) : []
        const found = list.find(p => p.id === savedPersonId)
        if (found) setActivePersonState(found)
      } catch {}
    }
  }, [])

  // Re-sync persons list whenever localStorage changes (e.g. after adding someone)
  useEffect(() => {
    function sync() {
      try {
        const raw = localStorage.getItem('monitored_persons_v2')
        if (raw) setPersons(JSON.parse(raw))
      } catch {}
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const setMode = useCallback((m: RoleMode) => {
    setModeState(m)
    localStorage.setItem('wfa_role_mode', m)
    if (m === 'self') {
      setActivePersonState(null)
      localStorage.removeItem('wfa_active_person_id')
    }
  }, [])

  const setActivePerson = useCallback((p: RolePerson | null) => {
    setActivePersonState(p)
    if (p) {
      localStorage.setItem('wfa_active_person_id', p.id)
      setModeState('member')
      localStorage.setItem('wfa_role_mode', 'member')
    } else {
      localStorage.removeItem('wfa_active_person_id')
      localStorage.setItem('wfa_role_mode', 'self')
      setModeState('self')
    }
  }, [])

  return (
    <RoleContext.Provider value={{ mode, activePerson, persons, setMode, setActivePerson }}>
      {children}
    </RoleContext.Provider>
  )
}

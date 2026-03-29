'use client'

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type {
  FlameoContext,
  FlameoContextStatus,
  FlameoAiRole,
} from '@/lib/flameo-context-types'

export type FlameoHubAgentPayload = {
  context: FlameoContext | null
  status: FlameoContextStatus | null
  flameoRole: FlameoAiRole
}

type BridgeValue = {
  payload: FlameoHubAgentPayload | null
  setPayload: (p: FlameoHubAgentPayload | null) => void
}

const FlameoHubAgentContext = createContext<BridgeValue | undefined>(undefined)

export function FlameoHubAgentProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<FlameoHubAgentPayload | null>(null)
  return (
    <FlameoHubAgentContext.Provider value={{ payload, setPayload }}>
      {children}
    </FlameoHubAgentContext.Provider>
  )
}

export function useFlameoHubAgentBridge(): BridgeValue {
  const v = useContext(FlameoHubAgentContext)
  if (!v) {
    throw new Error('useFlameoHubAgentBridge must be used within FlameoHubAgentProvider')
  }
  return v
}

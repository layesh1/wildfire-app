'use client'

import { usePathname } from 'next/navigation'
import type { FlameoNavConsumer, FlameoNavBase } from '@/lib/flameo-phase-c-tools'

/**
 * Derive bounded navigation context for Flameo Phase C tool responses.
 * `variant` overrides consumer when provided (e.g. evacuee AI route).
 */
export function useFlameoNavContext(variant?: FlameoNavConsumer): {
  consumer: FlameoNavConsumer
  navBase: FlameoNavBase
  flameoNavContext: { consumer: FlameoNavConsumer; navBase: FlameoNavBase }
} {
  const pathname = usePathname()
  const navBase: FlameoNavBase = pathname?.startsWith('/m/') ? 'mobile' : 'desktop'
  const fromPath: FlameoNavConsumer =
    pathname?.includes('/evacuee') ? 'evacuee' : 'caregiver'
  const consumer = variant ?? fromPath
  return {
    consumer,
    navBase,
    flameoNavContext: { consumer, navBase },
  }
}

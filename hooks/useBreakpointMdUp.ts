'use client'

import { useEffect, useState } from 'react'

/**
 * `undefined` until the client measures — avoids mounting two Leaflet maps when
 * mobile and desktop layouts both exist in the tree (hidden via CSS still mounts).
 * Uses `lg` (1024px) so hub layout matches sidebar desktop breakpoint.
 */
export function useBreakpointMdUp(): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setMatches(false)
      return
    }
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setMatches(mq.matches)
    sync()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync)
      return () => mq.removeEventListener('change', sync)
    }

    // Safari / embedded webviews fallback.
    const legacy = mq as MediaQueryList & {
      addListener?: (cb: (this: MediaQueryList, ev: MediaQueryListEvent) => any) => void
      removeListener?: (cb: (this: MediaQueryList, ev: MediaQueryListEvent) => any) => void
    }
    legacy.addListener?.(sync as any)
    return () => legacy.removeListener?.(sync as any)
  }, [])
  return matches
}

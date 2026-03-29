'use client'

import { useEffect, useState } from 'react'

/**
 * `undefined` until the client measures — avoids mounting two Leaflet maps when
 * mobile and desktop layouts both exist in the tree (hidden via CSS still mounts).
 */
export function useBreakpointMdUp(): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setMatches(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return matches
}

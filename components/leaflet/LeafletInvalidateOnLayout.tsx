'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/** Fixes gray/blank Leaflet tiles after tab focus, split view, or narrow Safari windows. */
export default function LeafletInvalidateOnLayout() {
  const map = useMap()
  useEffect(() => {
    function invalidate() {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize({ animate: false })
        } catch {
          /* ignore */
        }
      })
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') invalidate()
    }
    window.addEventListener('resize', invalidate)
    document.addEventListener('visibilitychange', onVisibility)
    let ro: ResizeObserver | null = null
    const el = map.getContainer()
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(invalidate)
      ro.observe(el)
    }
    invalidate()
    return () => {
      window.removeEventListener('resize', invalidate)
      document.removeEventListener('visibilitychange', onVisibility)
      ro?.disconnect()
    }
  }, [map])
  return null
}

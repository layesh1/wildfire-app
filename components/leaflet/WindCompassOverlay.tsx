'use client'

import type { WindData } from '@/app/dashboard/caregiver/map/LeafletMap'

function spreadLabel(deg: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

export default function WindCompassOverlay({ wind }: { wind: WindData }) {
  const needleRot = wind.directionDeg
  return (
    <div
      className="pointer-events-none absolute bottom-7 left-2.5 z-[1000] flex items-center gap-2 rounded-[10px] border border-gray-200 bg-white/95 px-2 py-1.5 text-xs text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-900/95 dark:text-gray-100"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
    >
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" className="text-gray-300 dark:text-gray-600" strokeWidth="1.5" />
        <text x="18" y="7" textAnchor="middle" fontSize="6" className="fill-gray-500 dark:fill-gray-400">
          N
        </text>
        <text x="18" y="33" textAnchor="middle" fontSize="6" className="fill-gray-500 dark:fill-gray-400">
          S
        </text>
        <text x="7" y="21" textAnchor="middle" fontSize="6" className="fill-gray-500 dark:fill-gray-400">
          W
        </text>
        <text x="30" y="21" textAnchor="middle" fontSize="6" className="fill-gray-500 dark:fill-gray-400">
          E
        </text>
        <g transform={`rotate(${needleRot}, 18, 18)`}>
          <polygon points="18,5 20,18 18,22 16,18" className="fill-blue-500 opacity-90" />
          <polygon points="18,22 20,18 18,31 16,18" className="fill-gray-400 opacity-80 dark:fill-gray-500" />
        </g>
      </svg>
      <div>
        <div className="font-semibold text-orange-600 dark:text-orange-400">
          Wind {Math.round(wind.speedMph)} mph
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Fire spreads {spreadLabel(wind.spreadDeg)}
        </div>
      </div>
    </div>
  )
}

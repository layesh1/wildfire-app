'use client'

import { Suspense } from 'react'
import { ConsumerHubDashboard } from '@/app/dashboard/evacuee/hub-dashboard'

/** Same map-first hub as household evacuee home — Flameo + NIFC + shelters; responder role + routes under /dashboard/responder. */
export default function ResponderDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500 text-sm">Loading hub…</div>}>
      <ConsumerHubDashboard consumerRole="emergency_responder" />
    </Suspense>
  )
}

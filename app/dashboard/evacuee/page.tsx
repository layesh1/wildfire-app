'use client'

import { Suspense } from 'react'
import { ConsumerHubDashboard } from '@/app/dashboard/evacuee/hub-dashboard'

export default function EvacueeDashboard() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500 text-sm">Loading hub…</div>}>
      <ConsumerHubDashboard consumerRole="evacuee" />
    </Suspense>
  )
}

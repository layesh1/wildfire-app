'use client'

import { Suspense } from 'react'
import { ConsumerHubDashboard } from '@/app/dashboard/evacuee/hub-dashboard'

/** Single consumer hub (Life360-style): same UI for all family accounts; profile role drives Flameo. */
export default function HomeDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500 text-sm">Loading hub…</div>}>
      <ConsumerHubDashboard consumerRole="evacuee" unifiedHub />
    </Suspense>
  )
}

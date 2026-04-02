'use client'

import { Suspense } from 'react'
import { ConsumerHubDashboard } from '@/app/dashboard/evacuee/hub-dashboard'

export default function MobileEvacueeHub() {
  return (
    <Suspense fallback={null}>
      <ConsumerHubDashboard />
    </Suspense>
  )
}

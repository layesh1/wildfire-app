'use client'

import { Suspense } from 'react'
import { ConsumerHubDashboard } from '@/app/dashboard/caregiver/page'

export default function MobileEvacueeHub() {
  return (
    <Suspense fallback={null}>
      <ConsumerHubDashboard consumerRole="evacuee" />
    </Suspense>
  )
}

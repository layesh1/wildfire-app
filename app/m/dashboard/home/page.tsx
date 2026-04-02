'use client'

import { Suspense } from 'react'
import { ConsumerHubDashboard } from '@/app/dashboard/evacuee/hub-dashboard'

export default function MobileHomeHub() {
  return (
    <Suspense fallback={null}>
      <ConsumerHubDashboard consumerRole="evacuee" unifiedHub />
    </Suspense>
  )
}

'use client'

import { Suspense } from 'react'
import EvacuationMapExperience from '@/components/evacuation/EvacuationMapExperience'

export default function HomeEvacuationMapPage() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-500 text-sm">Loading map…</div>}>
      <EvacuationMapExperience consumerRole="evacuee" />
    </Suspense>
  )
}

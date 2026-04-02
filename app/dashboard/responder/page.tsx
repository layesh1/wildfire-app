'use client'

import { Suspense } from 'react'
import ResponderCommandHubShell from '@/components/responder/ResponderCommandHubShell'

/** Command hub: evacuation-style map, hazards, shelters, opt-in households, Flameo COMMAND. */
export default function ResponderDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500 text-sm">Loading hub…</div>}>
      <ResponderCommandHubShell />
    </Suspense>
  )
}

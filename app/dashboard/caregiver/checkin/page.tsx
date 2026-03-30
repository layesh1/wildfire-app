import { Suspense } from 'react'
import { SafetyCheckIn } from '@/components/check-in/SafetyCheckIn'

export default function CaregiverCheckinPage() {
  return (
    <Suspense fallback={null}>
      <SafetyCheckIn consumerRole="evacuee" variant="desktop" />
    </Suspense>
  )
}

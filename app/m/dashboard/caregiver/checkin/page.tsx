import { Suspense } from 'react'
import { SafetyCheckIn } from '@/components/check-in/SafetyCheckIn'

export default function MobileCaregiverCheckinPage() {
  return (
    <Suspense fallback={null}>
      <SafetyCheckIn consumerRole="evacuee" variant="mobile" />
    </Suspense>
  )
}

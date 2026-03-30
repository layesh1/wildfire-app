'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MobileCaregiverAlertRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/m/dashboard/caregiver?panel=alerts')
  }, [router])
  return (
    <div className="px-4 py-8 text-center text-sm text-gray-500">
      Opening My alerts…
    </div>
  )
}

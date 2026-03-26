import { redirect } from 'next/navigation'
export default function MobileCheckinRedirect() {
  redirect('/dashboard/caregiver/checkin')
}

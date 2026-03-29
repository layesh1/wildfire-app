import { redirect } from 'next/navigation'

/** Early Fire Alert is integrated into My Hub → My alerts. */
export default function CaregiverAlertRedirectPage() {
  redirect('/dashboard/caregiver?panel=alerts')
}

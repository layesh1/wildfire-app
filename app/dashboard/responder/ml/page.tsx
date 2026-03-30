import { redirect } from 'next/navigation'

export default function ResponderMLRedirectPage() {
  redirect('/dashboard/responder/analytics?tab=ml')
}

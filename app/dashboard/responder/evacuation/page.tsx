import { redirect } from 'next/navigation'

/** Legacy route — command hub is the evacuation map. */
export default function ResponderEvacuationRedirectPage() {
  redirect('/dashboard/responder')
}

/**
 * Sends family invite email via Resend when RESEND_API_KEY is set; otherwise logs the link (dev).
 */

export type FamilyInviteEmailParams = {
  to: string
  acceptUrl: string
  inviterName: string
  inviterRole: 'caregiver' | 'evacuee'
}

export async function sendFamilyInviteEmail({
  to,
  acceptUrl,
  inviterName,
  inviterRole,
}: FamilyInviteEmailParams): Promise<{ sent: boolean; devLink?: string }> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Wildfire App <onboarding@resend.dev>'

  const roleLine =
    inviterRole === 'caregiver'
      ? 'A caregiver invited you to join their My Family circle on Wildfire.'
      : 'A family member invited you to connect as their caregiver on Wildfire.'

  const text = `${inviterName} invited you to My Family on Wildfire.\n\n${roleLine}\n\nOpen this link while signed in with this email (${to}):\n${acceptUrl}\n`

  const html = `
    <p><strong>${escapeHtml(inviterName)}</strong> invited you to <strong>My Family</strong> on Wildfire.</p>
    <p>${escapeHtml(roleLine)}</p>
    <p><a href="${escapeHtml(acceptUrl)}">Accept invitation</a></p>
    <p style="color:#666;font-size:12px">Use the email address <strong>${escapeHtml(to)}</strong> when you sign in to accept.</p>
  `

  if (!key) {
    console.info('[family-invite email] RESEND_API_KEY not set; accept URL:', acceptUrl)
    return { sent: false, devLink: acceptUrl }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${inviterName} invited you to My Family — Wildfire`,
      text,
      html,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[family-invite email] Resend error:', res.status, errText)
    return { sent: false, devLink: acceptUrl }
  }

  return { sent: true }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

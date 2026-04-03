/**
 * Sends My People invite email via Resend when RESEND_API_KEY is set; otherwise logs the link (dev).
 * The invite `token` is the same value accepted by /api/family/invite/accept and /auth/family-invite.
 *
 * Default HTML matches the Minutes Matter branded template used for Supabase “Confirm email” (same header/footer
 * and layout). Set RESEND_INVITE_EMAIL_STYLE=confirmation for a minimal plain alternative.
 */

export type FamilyInviteEmailParams = {
  to: string
  acceptUrl: string
  /** Opaque invite token (stored in family_invites.token) — show in email as copy-paste “invite code”. */
  inviteToken: string
  inviterName: string
  inviterRole: 'caregiver' | 'evacuee'
}

/** Groups hex token for readability in email (does not change the value used for accept). */
function formatInviteCodeForDisplay(token: string): string {
  const clean = token.replace(/\s+/g, '')
  return clean.replace(/(.{8})/g, '$1 ').trim()
}

/** Mirrors Supabase’s default “Confirm your signup” layout (plain h2 / p / link). */
function buildInviteEmailConfirmationStyle(params: {
  inviterName: string
  roleLine: string
  acceptUrl: string
  inviteeEmail: string
  inviteToken: string
  codeDisplay: string
}): { html: string; text: string } {
  const {
    inviterName,
    roleLine,
    acceptUrl,
    inviteeEmail,
    inviteToken,
    codeDisplay,
  } = params

  const text = [
    `${inviterName} invited you to My People on Minutes Matter.`,
    '',
    roleLine,
    '',
    'Follow this link to accept your invitation:',
    acceptUrl,
    '',
    `If the link does not work, use this invite code on the accept page: ${inviteToken}`,
    '',
    `You must sign in or sign up with ${inviteeEmail}.`,
  ].join('\n')

  const html = `
<h2>Accept your invitation</h2>
<p><strong>${escapeHtml(inviterName)}</strong> invited you to My People on Minutes Matter.</p>
<p>${escapeHtml(roleLine)}</p>
<p>Follow this link to accept your invitation:</p>
<p><a href="${escapeHtml(acceptUrl)}">Accept invitation</a></p>
<p>If the link does not work, use this invite code:</p>
<p style="font-family:ui-monospace,monospace;word-break:break-all">${escapeHtml(codeDisplay)}</p>
<p style="font-size:12px;color:#666">You must sign in or sign up with <strong>${escapeHtml(inviteeEmail)}</strong>.</p>
`.trim()

  return { html, text }
}

/** Same visual shell as Supabase “Confirm your email” (Minutes Matter branded); copy is My People–specific. */
function buildInviteEmailBrandedTemplate(params: {
  inviterName: string
  roleLine: string
  acceptUrl: string
  inviteeEmail: string
  codeDisplay: string
  inviteToken: string
}): { html: string; text: string } {
  const { inviterName, roleLine, acceptUrl, inviteeEmail, codeDisplay, inviteToken } =
    params

  const text = [
    `${inviterName} invited you to My People on Minutes Matter.`,
    '',
    roleLine,
    '',
    `Open this link while signed in with ${inviteeEmail}:`,
    acceptUrl,
    '',
    `Invite code (if the link fails): ${inviteToken}`,
    '',
    'Minutes Matter is not a replacement for official emergency directives. Always follow local authorities.',
  ].join('\n')

  const safeUrl = escapeHtml(acceptUrl)
  const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">
  <div style="background:#0a1f12;padding:32px 40px;border-radius:12px 12px 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
      <tr>
        <td style="vertical-align:middle;width:32px;height:32px;background:#16a34a;border-radius:8px;text-align:center;font-size:18px;line-height:32px;">🔥</td>
        <td style="vertical-align:middle;padding-left:10px;color:#ffffff;font-weight:700;font-size:18px;letter-spacing:-0.3px;">Minutes Matter</td>
      </tr>
    </table>
    <p style="color:#6ee7b7;font-size:13px;margin:0;">Equity-driven wildfire evacuation intelligence</p>
  </div>
  <div style="padding:40px;background:#f7faf8;border:1px solid #e5e7eb;border-top:none;">
    <h1 style="color:#111827;font-size:24px;font-weight:700;margin:0 0 12px 0;">Accept your My People invitation</h1>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 8px 0;">
      <strong style="color:#111827;">${escapeHtml(inviterName)}</strong> invited you to connect on <strong>My People</strong>.
    </p>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px 0;">${escapeHtml(roleLine)}</p>
    <a href="${safeUrl}"
      style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:32px;">
      Accept invitation →
    </a>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 16px 0;">
      <strong style="color:#374151;">Invite code</strong> (paste on the accept page if the button does not work):<br/>
      <span style="font-family:ui-monospace,Monaco,monospace;font-size:12px;word-break:break-all;color:#111827;">${escapeHtml(codeDisplay)}</span>
    </p>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 24px 0;">
      Sign in or sign up with <strong style="color:#374151;">${escapeHtml(inviteeEmail)}</strong> — this invite only works for that address.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px 0;" />
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px 0;">
      <strong style="color:#374151;">What you can do with My People:</strong>
    </p>
    <ul style="color:#6b7280;font-size:13px;line-height:2;padding-left:20px;margin:0 0 24px 0;">
      <li>Share safety status with trusted family or caregivers during wildfire events</li>
      <li>Coordinate check-ins alongside live alerts and evacuation tools</li>
      <li>Work with Flameo AI and shelter routing already in Minutes Matter</li>
    </ul>
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      If you didn&apos;t expect this invitation, you can ignore this email.<br/>
      Minutes Matter is not a replacement for official emergency directives. Always follow local authorities.
    </p>
  </div>
  <div style="padding:20px 40px;background:#f0fdf4;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
      WiDS Datathon 2025 · Data: WatchDuty · CDC SVI · NASA FIRMS
    </p>
  </div>
</div>`

  return { html, text }
}

export type SendFamilyInviteEmailResult = {
  sent: boolean
  devLink?: string
  /** Why email was not delivered (for UI copy; never includes secrets). */
  failureReason?: 'missing_api_key' | 'provider_error'
}

export async function sendFamilyInviteEmail({
  to,
  acceptUrl,
  inviteToken,
  inviterName,
  inviterRole,
}: FamilyInviteEmailParams): Promise<SendFamilyInviteEmailResult> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Wildfire App <onboarding@resend.dev>'

  const roleLine =
    inviterRole === 'caregiver'
      ? 'A caregiver invited you to join their My People list on Minutes Matter.'
      : 'A family member invited you to connect on Minutes Matter (My People).'

  const codeDisplay = formatInviteCodeForDisplay(inviteToken)

  const style = (process.env.RESEND_INVITE_EMAIL_STYLE || '').toLowerCase()
  const useConfirmationStyle = style === 'confirmation'

  const { html, text } = useConfirmationStyle
    ? buildInviteEmailConfirmationStyle({
        inviterName,
        roleLine,
        acceptUrl,
        inviteeEmail: to,
        inviteToken,
        codeDisplay,
      })
    : buildInviteEmailBrandedTemplate({
        inviterName,
        roleLine,
        acceptUrl,
        inviteeEmail: to,
        codeDisplay,
        inviteToken,
      })

  if (!key) {
    console.info('[family-invite email] RESEND_API_KEY not set; accept URL:', acceptUrl)
    return { sent: false, devLink: acceptUrl, failureReason: 'missing_api_key' }
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
      subject: `${inviterName} invited you to My People — Minutes Matter`,
      text,
      html,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[family-invite email] Resend error:', res.status, errText)
    return { sent: false, devLink: acceptUrl, failureReason: 'provider_error' }
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

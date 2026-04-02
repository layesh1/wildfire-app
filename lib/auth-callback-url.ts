/**
 * OAuth + email confirmation redirect target. Must be listed under
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 *
 * On localhost we always use the current origin so dev matches the browser tab.
 * Elsewhere, NEXT_PUBLIC_APP_URL wins when set (one stable URL for production).
 */
export function getAuthCallbackUrl(): string {
  if (typeof window === 'undefined') {
    const b = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    return b ? `${b}/auth/callback` : ''
  }
  const local =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  const base = (
    local ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  ).replace(/\/$/, '')
  return `${base}/auth/callback`
}

/** User-facing text for Supabase Auth email / resend failures. */
export function describeAuthEmailError(raw: string): string {
  const m = raw.trim()
  const lower = m.toLowerCase()

  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('over_email_send')) {
    return 'Too many emails were sent. Wait a few minutes, then try resend again.'
  }
  if (
    lower.includes('redirect') ||
    lower.includes('callback url') ||
    (lower.includes('url') && lower.includes('invalid'))
  ) {
    return (
      'This app’s confirmation link URL is not allowed for your Supabase project. '
      + 'In Supabase Dashboard → Authentication → URL Configuration, add your Site URL and '
      + 'Redirect URL (including /auth/callback). If you use Vercel previews, add a wildcard or each preview URL.'
    )
  }
  if (
    lower.includes('smtp') ||
    lower.includes('sending') ||
    lower.includes('mail') ||
    lower.includes('email provider')
  ) {
    return (
      'The project could not send email (SMTP or Auth email settings). '
      + 'In Supabase → Project Settings → Auth, configure a custom SMTP provider or check the built-in email limits.'
    )
  }
  if (lower.includes('already') && (lower.includes('confirm') || lower.includes('registered'))) {
    return 'This account may already be confirmed. Try signing in, or use Forgot password if needed.'
  }
  return m
}

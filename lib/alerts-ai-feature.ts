/**
 * Phase E (ANISHA): AI alert summaries are gated by deploy flag + user Settings toggle.
 * Set NEXT_PUBLIC_ALERTS_AI=1 (or "true") in the environment that builds the app.
 */
export function isAlertsAiDeploymentEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ALERTS_AI === '1' || process.env.NEXT_PUBLIC_ALERTS_AI === 'true'
  )
}

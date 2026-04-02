import type { SupabaseClient } from '@supabase/supabase-js'

export type ResponderAccessLogAction =
  | 'viewed_map'
  | 'viewed_household'
  | 'updated_status'
  | 'viewed_medical'
  | 'cleared_house'

/**
 * Fire-and-forget audit insert. Never await in critical path; failures must not block callers.
 */
export function logResponderAccessFireAndForget(
  supabase: SupabaseClient,
  responderUserId: string,
  payload: {
    action: ResponderAccessLogAction
    target_user_id?: string | null
    target_address?: string | null
  }
): void {
  void (async () => {
    try {
      const { error } = await supabase.from('responder_access_log').insert({
        responder_user_id: responderUserId,
        action: payload.action,
        target_user_id: payload.target_user_id ?? null,
        target_address: payload.target_address ?? null,
      })
      if (error) console.warn('[responder_access_log]', error.message)
    } catch (err: unknown) {
      console.warn('[responder_access_log]', err instanceof Error ? err.message : String(err))
    }
  })()
}

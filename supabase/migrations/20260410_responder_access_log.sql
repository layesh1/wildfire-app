-- MANUAL SUPABASE APPLY: run in SQL Editor if your project does not auto-apply migrations.
-- Phase 1C — Responder access audit log.

CREATE TABLE IF NOT EXISTS public.responder_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responder_user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  target_address text,
  target_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS responder_access_log_responder_idx
  ON public.responder_access_log (responder_user_id, accessed_at DESC);

COMMENT ON TABLE public.responder_access_log IS 'Audit trail for responder access to evacuee data; inserts from authenticated responders only.';

ALTER TABLE public.responder_access_log ENABLE ROW LEVEL SECURITY;

-- Responders insert only their own rows
CREATE POLICY responder_access_log_insert_own
  ON public.responder_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    responder_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'emergency_responder'
          OR (p.roles IS NOT NULL AND 'emergency_responder' = ANY (p.roles))
        )
    )
  );

-- Responders may read only their own log rows (not other responders)
CREATE POLICY responder_access_log_select_own
  ON public.responder_access_log
  FOR SELECT
  TO authenticated
  USING (responder_user_id = auth.uid());

-- No UPDATE/DELETE for authenticated (immutability); service role bypasses RLS for admin tooling.

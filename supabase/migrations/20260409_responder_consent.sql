-- MANUAL SUPABASE APPLY: run in SQL Editor if your project does not auto-apply migrations.
-- Phase 2 — Responder data-handling consent (versioned re-accept).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS responder_consent_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responder_consent_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS responder_consent_version integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.responder_consent_accepted IS 'Emergency responder accepted in-app data access agreement.';
COMMENT ON COLUMN public.profiles.responder_consent_accepted_at IS 'When responder_consent_accepted was set true.';
COMMENT ON COLUMN public.profiles.responder_consent_version IS 'Version of the agreement last accepted; must match app REQUIRED_RESPONDER_CONSENT_VERSION.';

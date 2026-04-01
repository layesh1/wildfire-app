-- ============================================================================
-- MANUAL: Apply in Supabase Dashboard → SQL Editor (do not rely on CI alone).
-- Responder notes on evacuee profile + optional RLS for service-role updates.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS responder_notes text;

COMMENT ON COLUMN public.profiles.responder_notes IS 'Optional notes from emergency responder field checks (server-updated via API).';

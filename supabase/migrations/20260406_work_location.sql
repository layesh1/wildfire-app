-- ============================================================================
-- MANUAL: Apply this migration in the Supabase SQL Editor (Dashboard → SQL).
-- Do not assume `supabase db push` ran in production until you execute it.
-- Work / secondary location for evacuee Flameo anchoring + floor guidance.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS work_address text,
  ADD COLUMN IF NOT EXISTS work_building_type text,
  ADD COLUMN IF NOT EXISTS work_floor_number integer,
  ADD COLUMN IF NOT EXISTS work_location_note text,
  ADD COLUMN IF NOT EXISTS work_address_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_work_building_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_work_building_type_check
  CHECK (
    work_building_type IS NULL
    OR work_building_type IN ('house', 'apartment', 'office', 'other')
  );

COMMENT ON COLUMN public.profiles.work_address IS 'Verified work or secondary street address (geocoded via app).';
COMMENT ON COLUMN public.profiles.work_building_type IS 'house | apartment | office | other';
COMMENT ON COLUMN public.profiles.work_floor_number IS 'Floor at work/secondary when building is multi-story.';
COMMENT ON COLUMN public.profiles.work_location_note IS 'Responder note for this location (e.g. wheelchair).';
COMMENT ON COLUMN public.profiles.work_address_verified IS 'True after user completes Verify & Save for work address.';

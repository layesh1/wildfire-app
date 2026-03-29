-- Mobility, accessibility, and medical context for responders and family notifications.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobility_access_needs text[] DEFAULT '{}'::text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobility_access_other text;

COMMENT ON COLUMN public.profiles.mobility_access_needs IS
  'Tags: e.g. wheelchair_user, disabilities, medical_conditions, other — see app onboarding.';

COMMENT ON COLUMN public.profiles.mobility_access_other IS
  'Free text when user selects "other" for mobility/access/medical needs.';

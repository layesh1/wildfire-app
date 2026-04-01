-- Fix: "infinite recursion detected in policy for relation profiles"
-- The responder SELECT policy must not subquery public.profiles (that re-evaluates RLS).
-- Use a STABLE SECURITY DEFINER helper so the caller's role is read without recursion.
--
-- MANUAL: Run in Supabase Dashboard → SQL Editor if migrations are not auto-applied.

CREATE OR REPLACE FUNCTION public.auth_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_profile_role() TO authenticated;

COMMENT ON FUNCTION public.auth_profile_role() IS
  'Current user profile.role; SECURITY DEFINER to avoid RLS recursion in policies.';

DROP POLICY IF EXISTS "profiles: responder read consented" ON public.profiles;

CREATE POLICY "profiles: responder read consented" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.auth_profile_role() = 'emergency_responder'::text
    AND (
      public.profiles.responder_data_consent IS TRUE
      OR (
        public.profiles.location_sharing_consent IS TRUE
        AND public.profiles.evacuation_status_consent IS TRUE
      )
    )
  );

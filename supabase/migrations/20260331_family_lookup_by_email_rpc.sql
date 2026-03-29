-- Allow caregivers to resolve another user by login email for “Add family” without exposing
-- broad profile reads. Email is read from auth.users; role/name from public.profiles.

CREATE OR REPLACE FUNCTION public.family_lookup_user_by_email(p_email text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p.id AS user_id,
    COALESCE(NULLIF(trim(p.full_name), ''), '') AS full_name,
    COALESCE(p.role::text, '') AS role
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE lower(trim(u.email)) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.family_lookup_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_lookup_user_by_email(text) TO authenticated;

COMMENT ON FUNCTION public.family_lookup_user_by_email(text) IS
  'Returns one profile row for a login email (for caregiver add-family). Uses auth.users for email match.';

-- Fix: deleting auth.users failed with
--   ERROR: 23503: update or delete on table "users" violates foreign key constraint
--   "profiles_id_fkey" on table "profiles"
-- When a profile row exists, it must be removed first—or the FK must CASCADE.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT profiles_id_fkey ON public.profiles IS
  'Removing the auth user deletes this profile row (and dependent data per other FKs).';

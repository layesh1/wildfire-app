-- When someone is "added" by email before they have an account, a pending row exists in
-- family_invites. On first profile insert for that auth user, link symmetrically (same as
-- accept_family_invite) so no email or token acceptance is required.

CREATE OR REPLACE FUNCTION public.family_claim_pending_invites_after_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  em text;
  rec record;
BEGIN
  SELECT lower(trim(u.email)) INTO em FROM auth.users u WHERE u.id = NEW.id;
  IF em IS NULL OR em = '' THEN
    RETURN NEW;
  END IF;

  FOR rec IN
    SELECT fi.id, fi.inviter_user_id
    FROM public.family_invites fi
    WHERE fi.status = 'pending'
      AND lower(trim(fi.invitee_email)) = em
      AND fi.inviter_user_id IS DISTINCT FROM NEW.id
      AND fi.expires_at > now()
  LOOP
    INSERT INTO public.caregiver_family_links (caregiver_user_id, evacuee_user_id)
    VALUES (rec.inviter_user_id, NEW.id)
    ON CONFLICT (caregiver_user_id, evacuee_user_id) DO NOTHING;
    INSERT INTO public.caregiver_family_links (caregiver_user_id, evacuee_user_id)
    VALUES (NEW.id, rec.inviter_user_id)
    ON CONFLICT (caregiver_user_id, evacuee_user_id) DO NOTHING;

    UPDATE public.family_invites
    SET status = 'accepted',
        accepted_at = now(),
        accepted_by_user_id = NEW.id
    WHERE id = rec.id;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.family_claim_pending_invites_after_profile_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS tr_profiles_claim_family_invites ON public.profiles;
CREATE TRIGGER tr_profiles_claim_family_invites
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.family_claim_pending_invites_after_profile_insert();

COMMENT ON FUNCTION public.family_claim_pending_invites_after_profile_insert() IS
  'Links inviter↔new user from pending family_invites when profile is created for matching auth email; no token step.';

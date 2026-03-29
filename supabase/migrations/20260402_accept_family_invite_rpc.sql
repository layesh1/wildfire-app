-- Accept a pending family invite when the logged-in user’s auth email matches invitee_email.

CREATE OR REPLACE FUNCTION public.accept_family_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.family_invites%ROWTYPE;
  accepter_email text;
  accepter_role text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_token');
  END IF;

  SELECT * INTO inv
  FROM public.family_invites
  WHERE token = trim(p_token)
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  END IF;

  IF inv.inviter_user_id = uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_accept_own_invite');
  END IF;

  SELECT email INTO accepter_email FROM auth.users WHERE id = uid;
  IF accepter_email IS NULL OR lower(trim(accepter_email)) <> lower(trim(inv.invitee_email)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  SELECT COALESCE(p.role::text, '') INTO accepter_role FROM public.profiles p WHERE p.id = uid;

  IF inv.inviter_role = 'evacuee' THEN
    IF accepter_role <> 'caregiver' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_role_need_caregiver');
    END IF;
    INSERT INTO public.caregiver_family_links (caregiver_user_id, evacuee_user_id)
    VALUES (uid, inv.inviter_user_id)
    ON CONFLICT (caregiver_user_id, evacuee_user_id) DO NOTHING;
  ELSIF inv.inviter_role = 'caregiver' THEN
    IF accepter_role <> 'evacuee' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'wrong_role_need_evacuee');
    END IF;
    INSERT INTO public.caregiver_family_links (caregiver_user_id, evacuee_user_id)
    VALUES (inv.inviter_user_id, uid)
    ON CONFLICT (caregiver_user_id, evacuee_user_id) DO NOTHING;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_inviter_role');
  END IF;

  UPDATE public.family_invites
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by_user_id = uid
  WHERE id = inv.id;

  RETURN jsonb_build_object(
    'ok', true,
    'inviter_role', inv.inviter_role,
    'inviter_user_id', inv.inviter_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_family_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_family_invite(text) TO authenticated;

COMMENT ON FUNCTION public.accept_family_invite(text) IS
  'Links caregiver↔evacuee when invitee email matches auth.users; updates family_invites row.';

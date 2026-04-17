-- Unified My People: accept invite for evacuee↔evacuee (and legacy caregiver) without wrong-role rejects.
-- Mirror link RPC: reverse caregiver_family_links row bypasses RLS (client insert as "peer caregiver" was blocked).

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

  -- Both directed edges so hub / RLS queries see the relationship from either account.
  INSERT INTO public.caregiver_family_links (caregiver_user_id, evacuee_user_id)
  VALUES (inv.inviter_user_id, uid)
  ON CONFLICT (caregiver_user_id, evacuee_user_id) DO NOTHING;
  INSERT INTO public.caregiver_family_links (caregiver_user_id, evacuee_user_id)
  VALUES (uid, inv.inviter_user_id)
  ON CONFLICT (caregiver_user_id, evacuee_user_id) DO NOTHING;

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
  'Accept My People invite when logged-in email matches invitee_email; inserts symmetric caregiver_family_links rows.';

CREATE OR REPLACE FUNCTION public.mirror_caregiver_family_link(p_inviter uuid, p_peer uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_inviter THEN
    RAISE EXCEPTION 'mirror_caregiver_family_link: not_inviter';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.caregiver_family_links
    WHERE caregiver_user_id = p_inviter AND evacuee_user_id = p_peer
  ) THEN
    RAISE EXCEPTION 'mirror_caregiver_family_link: no_primary_link';
  END IF;
  INSERT INTO public.caregiver_family_links (caregiver_user_id, evacuee_user_id)
  VALUES (p_peer, p_inviter)
  ON CONFLICT (caregiver_user_id, evacuee_user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.mirror_caregiver_family_link(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mirror_caregiver_family_link(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.mirror_caregiver_family_link(uuid, uuid) IS
  'After inviter inserts (inviter, peer), adds reverse (peer, inviter); SECURITY DEFINER because RLS only allows inviter as caregiver_user_id on insert.';

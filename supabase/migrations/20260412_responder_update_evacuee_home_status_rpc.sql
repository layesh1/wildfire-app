-- Allow emergency responders (with in-app consent) to update home evacuation status on
-- profiles that opted in — without SUPABASE_SERVICE_ROLE_KEY on the Next.js server.

CREATE OR REPLACE FUNCTION public.responder_update_evacuee_home_status(
  p_target_user_id uuid,
  p_home_evacuation_status text,
  p_update_notes boolean DEFAULT false,
  p_responder_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
  caller_roles text[];
  caller_consent_ok boolean;
  target_consented boolean;
BEGIN
  IF caller_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_home_evacuation_status IS NULL
     OR p_home_evacuation_status NOT IN ('not_evacuated', 'evacuated', 'cannot_evacuate') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  SELECT p.role::text, COALESCE(p.roles, ARRAY[]::text[])
  INTO caller_role, caller_roles
  FROM public.profiles p
  WHERE p.id = caller_id;

  IF caller_role IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF NOT (
    caller_role = 'emergency_responder'
    OR 'emergency_responder' = ANY (caller_roles)
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT
    COALESCE(p.responder_consent_accepted, false)
    AND COALESCE(p.responder_consent_version, 0) >= 1
  INTO caller_consent_ok
  FROM public.profiles p
  WHERE p.id = caller_id;

  IF NOT COALESCE(caller_consent_ok, false) THEN
    RETURN json_build_object('ok', false, 'error', 'consent_required');
  END IF;

  SELECT
    COALESCE(p.location_sharing_consent, false)
    AND COALESCE(p.evacuation_status_consent, false)
  INTO target_consented
  FROM public.profiles p
  WHERE p.id = p_target_user_id;

  IF NOT FOUND OR target_consented IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  IF NOT target_consented THEN
    RETURN json_build_object('ok', false, 'error', 'target_not_consented');
  END IF;

  UPDATE public.profiles AS pr
  SET
    home_evacuation_status = p_home_evacuation_status,
    home_status_updated_at = now(),
    responder_notes = CASE
      WHEN p_update_notes THEN left(COALESCE(p_responder_notes, ''), 2000)
      ELSE pr.responder_notes
    END
  WHERE pr.id = p_target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.responder_update_evacuee_home_status(uuid, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_update_evacuee_home_status(uuid, text, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.responder_update_evacuee_home_status IS
  'Responder updates consented evacuee home_evacuation_status; enforces role, responder consent, and target location+evacuation consents.';

-- Pending email invites for My Family (evacuee ↔ caregiver). Run in Supabase SQL Editor or via CLI.

CREATE TABLE IF NOT EXISTS public.family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  inviter_role text NOT NULL CHECK (inviter_role IN ('caregiver', 'evacuee')),
  invitee_email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_family_invites_inviter ON public.family_invites (inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_family_invites_email_lower ON public.family_invites (lower(invitee_email));
CREATE UNIQUE INDEX IF NOT EXISTS family_invites_one_pending_per_pair
  ON public.family_invites (inviter_user_id, lower(invitee_email))
  WHERE status = 'pending';

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_invites: inviter select own" ON public.family_invites;
CREATE POLICY "family_invites: inviter select own" ON public.family_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = inviter_user_id);

DROP POLICY IF EXISTS "family_invites: inviter insert" ON public.family_invites;
CREATE POLICY "family_invites: inviter insert" ON public.family_invites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_user_id);

DROP POLICY IF EXISTS "family_invites: inviter update own pending" ON public.family_invites;
CREATE POLICY "family_invites: inviter update own pending" ON public.family_invites
  FOR UPDATE TO authenticated
  USING (auth.uid() = inviter_user_id AND status = 'pending')
  WITH CHECK (auth.uid() = inviter_user_id);

COMMENT ON TABLE public.family_invites IS
  'Email-based family linking; accept via accept_family_invite(token) when logged in as invitee.';

import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateString, ValidationError } from '@/lib/validate'
import { linkCaregiverToEvacueeByEmail, mirrorFamilyLinkForEvacuee } from '@/lib/family-link'
import { sendFamilyInviteEmail } from '@/lib/send-family-invite-email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

/**
 * Unified evacuee model: any consumer (evacuee or legacy caregiver row) can invite by email.
 * If the address matches an existing evacuee (or legacy caregiver) account → link both ways in My People.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const emailRaw = validateString(body.email, 'email', { maxLength: 320, minLength: 3 })
    if (!EMAIL_RE.test(emailRaw.trim())) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    const email = emailRaw.trim().toLowerCase()

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const inviterEmail = (user.email || '').toLowerCase().trim()
    if (inviterEmail && email === inviterEmail) {
      return NextResponse.json({ error: 'You cannot invite your own email.' }, { status: 400 })
    }

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profErr || !prof) {
      return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 })
    }

    const role = (prof as { role?: string }).role
    const inviterName = ((prof as { full_name?: string }).full_name || '').trim() || 'Someone'

    if (role !== 'caregiver' && role !== 'evacuee') {
      return NextResponse.json({ error: 'Only evacuee accounts can send My People invites.' }, { status: 400 })
    }

    const { data: lookupRows, error: findErr } = await supabase.rpc('family_lookup_user_by_email', {
      p_email: email,
    })
    if (findErr) {
      console.error('[family/send-invite] lookup', findErr)
      return NextResponse.json({ error: 'Could not look up that email.' }, { status: 500 })
    }

    const row = Array.isArray(lookupRows) ? lookupRows[0] : lookupRows
    if (row?.user_id) {
      const target = {
        user_id: row.user_id as string,
        full_name: (row.full_name as string) || null,
        role: (row.role as string) || null,
      }
      if (target.user_id === user.id) {
        return NextResponse.json({ error: 'You cannot add yourself.' }, { status: 400 })
      }
      const tr = target.role || ''
      if (tr !== 'evacuee' && tr !== 'caregiver') {
        return NextResponse.json(
          { error: 'That email belongs to an account type that cannot be added to My People here.' },
          { status: 400 }
        )
      }
      const linked = await linkCaregiverToEvacueeByEmail(supabase, user.id, email, target)
      if (!linked.ok) {
        if (linked.code === 'self') {
          return NextResponse.json({ error: 'You cannot add yourself.' }, { status: 400 })
        }
        if (linked.code === 'not_evacuee') {
          return NextResponse.json(
            { error: 'That email is not a household account. Invite them to sign up as an evacuee first.' },
            { status: 400 }
          )
        }
        return NextResponse.json({ error: linked.message }, { status: 500 })
      }
      await mirrorFamilyLinkForEvacuee(supabase, user.id, target.user_id, user.email || inviterEmail)
      return NextResponse.json({
        ok: true,
        mode: 'linked',
        name: linked.name,
        alreadyLinked: linked.alreadyLinked,
        message: linked.alreadyLinked ? 'Already in My People' : 'Added to My People',
      })
    }

    const token = randomBytes(24).toString('hex')
    const { error: insErr } = await supabase.from('family_invites').insert({
      inviter_user_id: user.id,
      inviter_role: 'evacuee',
      invitee_email: email,
      token,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    })

    if (insErr) {
      if (insErr.code === '23505') {
        return NextResponse.json(
          { error: 'You already have a pending invite for that email.' },
          { status: 409 }
        )
      }
      console.error('[family/send-invite] insert', insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    const acceptUrl = `${appBaseUrl()}/auth/family-invite?token=${encodeURIComponent(token)}`
    const emailed = await sendFamilyInviteEmail({
      to: email,
      acceptUrl,
      inviterName,
      inviterRole: 'evacuee',
    })

    return NextResponse.json({
      ok: true,
      mode: 'invite_sent',
      emailSent: emailed.sent,
      devLink: emailed.devLink,
      message: emailed.sent
        ? 'Invitation email sent. They can accept with the same email after signing up.'
        : 'Invitation created. Share the accept link with them (check server logs if email is not configured).',
    })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

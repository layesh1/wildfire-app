import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateString, ValidationError } from '@/lib/validate'
import { linkCaregiverToEvacueeByEmail, mirrorFamilyLinkForEvacuee } from '@/lib/family-link'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

/**
 * Unified evacuee model: any consumer (evacuee or legacy caregiver row) can add by email.
 * If the address matches an existing account → link both ways in My People.
 * If not, a pending family_invites row is created; when they sign up with that email, a DB trigger
 * completes the symmetric link (no Resend, no token acceptance).
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
      console.error('[family/send-invite] profile (full error object):', profErr)
      return NextResponse.json(
        {
          error: 'Could not load your profile.',
          details: profErr?.message,
          code: profErr?.code,
        },
        { status: 500 }
      )
    }

    const role = (prof as { role?: string }).role
    const inviterRoleForDb: 'caregiver' | 'evacuee' = role === 'caregiver' ? 'caregiver' : 'evacuee'

    if (role !== 'caregiver' && role !== 'evacuee') {
      return NextResponse.json({ error: 'Only evacuee accounts can send My People invites.' }, { status: 400 })
    }

    const { data: lookupRows, error: findErr } = await supabase.rpc('family_lookup_user_by_email', {
      p_email: email,
    })
    if (findErr) {
      console.error('[family/send-invite] lookup (full error object):', findErr)
      return NextResponse.json(
        { error: 'Could not look up that email.', details: findErr.message, code: findErr.code },
        { status: 500 }
      )
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
        /** Lets the hub merge this row if Supabase profile reads fail (e.g. missing anon key). */
        linkedUserId: target.user_id,
        linkedEmail: email,
      })
    }

    // Cancel any existing pending invite for this pair so we can issue a fresh token.
    // (The unique constraint is a partial index on pending rows, so we can't upsert — cancel first.)
    await supabase
      .from('family_invites')
      .update({ status: 'cancelled' })
      .eq('inviter_user_id', user.id)
      .ilike('invitee_email', email)
      .eq('status', 'pending')

    const token = randomBytes(24).toString('hex')
    const { error: insErr } = await supabase.from('family_invites').insert({
      inviter_user_id: user.id,
      inviter_role: inviterRoleForDb,
      invitee_email: email,
      token,
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    })

    if (insErr) {
      console.error('[family/send-invite] insert (full error object):', insErr)
      return NextResponse.json(
        { error: insErr.message, details: insErr.details, hint: insErr.hint, code: insErr.code },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      mode: 'pending_signup',
      message:
        'Added. When they create an account with this email, they will appear in My People automatically (no invite email or link).',
    })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.log('[family/send-invite] unhandled (full error object):', e)
    console.error('[family/send-invite] unhandled (full error):', e)
    const message = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : undefined
    return NextResponse.json(
      {
        error: message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && stack ? { stack } : {}),
      },
      { status: 500 }
    )
  }
}

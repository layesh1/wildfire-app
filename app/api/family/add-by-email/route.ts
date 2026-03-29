import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateString, ValidationError } from '@/lib/validate'
import { linkCaregiverToEvacueeByEmail } from '@/lib/family-link'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = validateString(body.email, 'email', { maxLength: 320, minLength: 3 }).toLowerCase()

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: lookupRows, error: findErr } = await supabase.rpc('family_lookup_user_by_email', {
      p_email: email,
    })

    if (findErr) {
      console.error('[family/add-by-email] lookup', findErr)
      return NextResponse.json(
        {
          error:
            'Could not look up that email. If this keeps happening, run the latest database migration (family_lookup_user_by_email).',
        },
        { status: 500 }
      )
    }

    const row = Array.isArray(lookupRows) ? lookupRows[0] : lookupRows
    if (!row?.user_id) {
      return NextResponse.json(
        { error: 'No account found with that email. Ask them to sign up first, or use Invite by email from the hub.' },
        { status: 404 }
      )
    }

    const target = {
      user_id: row.user_id as string,
      full_name: (row.full_name as string) || null,
      role: (row.role as string) || null,
    }

    const result = await linkCaregiverToEvacueeByEmail(supabase, user.id, email, target)
    if (!result.ok) {
      if (result.code === 'self') {
        return NextResponse.json({ error: 'You cannot add yourself.' }, { status: 400 })
      }
      if (result.code === 'not_evacuee') {
        return NextResponse.json({ error: 'That account is not an evacuee profile.' }, { status: 400 })
      }
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      alreadyLinked: result.alreadyLinked,
      name: result.name,
      message: 'Added to My Family',
    })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

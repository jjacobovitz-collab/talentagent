import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, action, side } = await request.json()
  // action: 'confirm' | 'dismiss'
  // side: 'candidate' | 'company'

  const admin = createAdminClient()
  const { data: match } = await admin
    .from('autonomous_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Validate the user is allowed to act on this side
  if (side === 'candidate' && match.candidate_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (side === 'company' && match.recruiter_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: any = {}

  if (side === 'candidate') {
    updates.candidate_confirmation_status = action === 'confirm' ? 'confirmed' : 'dismissed'
    updates.candidate_confirmed_at = new Date().toISOString()
    updates.match_status = action === 'confirm' ? 'candidate_confirmed' : 'candidate_dismissed'
    updates.candidate_status = action === 'confirm' ? 'interested' : 'not_interested'
  } else if (side === 'company') {
    updates.company_confirmation_status = action === 'confirm' ? 'confirmed' : 'dismissed'
    updates.company_confirmed_at = new Date().toISOString()
    updates.match_status = action === 'confirm' ? 'company_confirmed' : 'company_dismissed'
  }

  // Check for mutual confirmation
  const candidateConfirmed = side === 'candidate'
    ? action === 'confirm'
    : match.candidate_confirmation_status === 'confirmed'

  const companyConfirmed = side === 'company'
    ? action === 'confirm'
    : match.company_confirmation_status === 'confirmed'

  if (candidateConfirmed && companyConfirmed) {
    updates.match_status = 'revealed'
    updates.revealed_at = new Date().toISOString()

    // Notify candidate — reveal company name
    await admin.from('notifications').insert({
      user_id: match.candidate_id,
      type: 'match_revealed',
      title: 'Mutual match confirmed — company revealed',
      body: 'Both you and the hiring team confirmed interest. Your agent is preparing an introduction.',
      data: { match_id: match.id },
    })

    // Notify recruiter — reveal candidate
    if (match.recruiter_id) {
      await admin.from('notifications').insert({
        user_id: match.recruiter_id,
        type: 'match_revealed',
        title: 'Mutual match confirmed — candidate revealed',
        body: 'Both the candidate and your team confirmed interest. Review their full profile.',
        data: { match_id: match.id },
      })
    }

    // Trigger outreach draft (fire and forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${appUrl}/api/outreach/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ matchId: match.id }),
    }).catch(console.error)
  }

  await admin.from('autonomous_matches').update(updates).eq('id', matchId)

  return NextResponse.json({ success: true, status: updates.match_status })
}

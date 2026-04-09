import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, message } = await request.json()

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }
  if (message.length > 200) {
    return NextResponse.json({ error: 'Message must be 200 characters or less' }, { status: 400 })
  }
  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 })
  }

  // Verify match belongs to this candidate and is in a nudgeable state
  const { data: match } = await admin
    .from('autonomous_matches')
    .select('id, candidate_id, buyer_agent_id, match_status')
    .eq('id', matchId)
    .eq('candidate_id', user.id)
    .single()

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }
  if (!['pending_candidate', 'candidate_confirmed'].includes(match.match_status)) {
    return NextResponse.json({ error: 'Match is not in a nudgeable state' }, { status: 400 })
  }

  // Check nudge quota
  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('nudges_used')
    .eq('user_id', user.id)
    .single()

  const nudgesUsed = candidateProfile?.nudges_used ?? 0
  if (nudgesUsed >= 5) {
    return NextResponse.json({ error: 'You have used all 5 nudges' }, { status: 400 })
  }

  // Check for duplicate nudge on this match
  const { data: existing } = await supabase
    .from('nudges')
    .select('id')
    .eq('candidate_id', user.id)
    .eq('match_id', matchId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You have already nudged this match' }, { status: 400 })
  }

  // Insert nudge
  const { data: nudge, error: nudgeError } = await supabase
    .from('nudges')
    .insert({ candidate_id: user.id, match_id: matchId, message: message.trim() })
    .select()
    .single()

  if (nudgeError) {
    return NextResponse.json({ error: 'Failed to save nudge' }, { status: 500 })
  }

  // Increment nudges_used
  await supabase
    .from('candidate_profiles')
    .update({ nudges_used: nudgesUsed + 1 })
    .eq('user_id', user.id)

  // Get buyer agent for recruiter notification
  const { data: buyerAgent } = await admin
    .from('buyer_agents')
    .select('recruiter_id, role_title, company_name')
    .eq('id', match.buyer_agent_id)
    .single()

  if (buyerAgent?.recruiter_id) {
    await admin.from('notifications').insert({
      user_id: buyerAgent.recruiter_id,
      type: 'candidate_nudge',
      title: `Candidate nudged your ${buyerAgent.role_title} role`,
      body: message.trim(),
      data: { match_id: matchId, nudge_id: nudge.id },
    })
  }

  return NextResponse.json({ success: true, nudgesUsed: nudgesUsed + 1 })
}

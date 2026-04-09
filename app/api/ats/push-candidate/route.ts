import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, atsType } = await request.json()

  const { data: match } = await supabase
    .from('autonomous_matches')
    .select(`
      *,
      candidate_profiles(*, profiles(full_name, email)),
      github_profiles(technical_fingerprint),
      job_postings(source_job_id, company_name, title)
    `)
    .eq('id', matchId)
    .single()

  if (!match || match.match_status !== 'revealed') {
    return NextResponse.json({ error: 'Match not revealed' }, { status: 400 })
  }

  const { data: atsConnection } = await supabase
    .from('ats_connections')
    .select('*')
    .eq('recruiter_id', user.id)
    .eq('ats_type', atsType)
    .eq('is_active', true)
    .single()

  if (!atsConnection) {
    return NextResponse.json({ error: 'ATS not connected' }, { status: 400 })
  }

  const candidate = match.candidate_profiles
  const fingerprint = match.github_profiles?.technical_fingerprint

  try {
    let result
    if (atsType === 'greenhouse') {
      result = await pushToGreenhouse(atsConnection, match, candidate, fingerprint)
    } else if (atsType === 'lever') {
      result = await pushToLever(atsConnection, match, candidate, fingerprint)
    } else {
      return NextResponse.json({ error: 'Unsupported ATS type' }, { status: 400 })
    }

    await supabase.from('jd_parses').update({
      ats_push_status: 'pushed',
      ats_pushed_at: new Date().toISOString()
    }).eq('buyer_agent_id', match.buyer_agent_id)

    return NextResponse.json({ success: true, result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function pushToGreenhouse(
  connection: Record<string, string>,
  match: Record<string, unknown>,
  candidate: Record<string, unknown>,
  fingerprint: Record<string, unknown> | null
) {
  const profiles = candidate.profiles as Record<string, string>
  const nameParts = (profiles.full_name || '').split(' ')
  const note = `Sourced via TalentAgent bilateral matching platform.

Match Score: ${match.overall_fit_score}/100
Technical Fit: ${match.technical_fit_score}/100
Recommendation: ${match.recommendation}

Agent Summary: ${match.recommendation_summary}

GitHub Verification: ${fingerprint?.summary || 'Not available'}
GitHub Strength: ${fingerprint?.overall_github_strength}/10
Seniority Estimate: ${fingerprint?.seniority_estimate}

Both candidate and hiring team confirmed mutual interest before introduction.`.trim()

  const response = await fetch('https://harvest.greenhouse.io/v1/candidates', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(connection.api_key + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'On-Behalf-Of': connection.greenhouse_user_id || ''
    },
    body: JSON.stringify({
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' ') || 'Unknown',
      email_addresses: [{ value: profiles.email, type: 'personal' }],
      tags: ['TalentAgent', `Score: ${match.overall_fit_score}`],
      notes: note
    })
  })

  if (!response.ok) throw new Error(`Greenhouse API error: ${response.status}`)
  return response.json()
}

async function pushToLever(
  connection: Record<string, string>,
  match: Record<string, unknown>,
  candidate: Record<string, unknown>,
  fingerprint: Record<string, unknown> | null
) {
  const profiles = candidate.profiles as Record<string, string>
  const note = `Sourced via TalentAgent. Match score: ${match.overall_fit_score}/100. ${match.recommendation_summary}`

  const response = await fetch('https://api.lever.co/v1/opportunities', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(connection.api_key + ':').toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      perform_as: connection.lever_user_id,
      posting: connection.lever_posting_id,
      contact: {
        name: profiles.full_name,
        email: profiles.email,
        headline: `TalentAgent Match - Score: ${match.overall_fit_score}/100`
      },
      createdAt: Date.now(),
      tags: ['TalentAgent'],
      sources: ['TalentAgent'],
      notes: [{ value: note }]
    })
  })

  if (!response.ok) throw new Error(`Lever API error: ${response.status}`)
  // fingerprint used for potential future enhancement
  void fingerprint
  return response.json()
}

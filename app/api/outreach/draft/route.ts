import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  // Allow internal calls with CRON_SECRET or authenticated user
  const admin = createAdminClient()

  let matchId: string
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    const body = await request.json()
    matchId = body.matchId
  } else {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    matchId = body.matchId
  }

  const { data: match } = await admin
    .from('autonomous_matches')
    .select('*, job_postings(*), candidate_profiles:candidate_id(*, profiles(full_name)), github_profiles:candidate_id(technical_fingerprint)')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const jobPosting = match.job_postings
  const candidateProfile = match.candidate_profiles
  const githubFingerprint = (match.github_profiles as any)?.technical_fingerprint
  const candidateName = (candidateProfile as any)?.profiles?.full_name || 'the candidate'

  const standoutProjects = githubFingerprint?.standout_projects?.slice(0, 2)
    .map((p: any) => `${p.name}: ${p.why_notable}`)
    .join('; ') || 'strong open source work'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are representing ${candidateName} as their career agent. Draft a concise, professional introduction email to the hiring team at ${jobPosting?.company_name} for the ${jobPosting?.title} position.

The email must:
- Be under 200 words
- Lead with the most compelling evidence from their GitHub work relevant to this role
- Reference 1-2 specific projects that demonstrate fit
- Not use generic phrases like "I am excited to apply"
- Sound like a human wrote it, not a bot
- Include a specific question about the role to show genuine interest
- End with a clear ask for a conversation

Candidate background: ${githubFingerprint?.summary || 'Experienced software engineer'}
Most relevant GitHub work: ${standoutProjects}
Role requirements: ${JSON.stringify(jobPosting?.parsed_requirements?.required_skills || [])}
Fit assessment: ${match.recommendation_summary || 'Strong technical fit identified'}

Return ONLY the email body text, no subject line, no JSON wrapper.`,
    }],
  })

  const draft = message.content[0].type === 'text' ? message.content[0].text : ''

  await admin.from('autonomous_matches').update({
    outreach_email_draft: draft,
  }).eq('id', matchId)

  return NextResponse.json({ draft })
}

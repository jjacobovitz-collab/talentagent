import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { buyerAgentId } = await request.json()
  const supabase = createAdminClient()

  const { data: buyerAgent } = await supabase
    .from('buyer_agents')
    .select('*, company_profiles(*)')
    .eq('id', buyerAgentId)
    .single()

  if (!buyerAgent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: candidates } = await supabase
    .from('candidate_profiles')
    .select('*, github_profiles(*), agent_settings(*)')
    .eq('github_profiles.ingestion_status', 'complete')

  let matchesCreated = 0

  for (const candidate of candidates || []) {
    const { data: existing } = await supabase
      .from('autonomous_matches')
      .select('id')
      .eq('candidate_id', candidate.user_id)
      .eq('buyer_agent_id', buyerAgentId)
      .maybeSingle()

    if (existing) continue

    const preFilterScore = calculatePreFilterScore(candidate, buyerAgent)
    if (preFilterScore < 30) continue

    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/coordinate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.user_id,
          buyerAgentId,
          jobPostingId: null
        })
      })
      matchesCreated++
    } catch (err) {
      console.error('Match failed for candidate:', candidate.user_id, err)
    }
  }

  return NextResponse.json({ matchesCreated })
}

function calculatePreFilterScore(candidate: Record<string, unknown>, buyerAgent: Record<string, unknown>): number {
  let score = 0

  const githubProfiles = candidate.github_profiles as Record<string, unknown> | null
  const fingerprint = githubProfiles?.technical_fingerprint as Record<string, unknown> | null
  if (!fingerprint) return 0

  const primaryLangs = fingerprint.primary_languages as Array<{ language: string }> | null
  const candidateLangs = primaryLangs?.map(l => l.language.toLowerCase()) || []
  const requiredSkills = ((buyerAgent.required_skills as string[]) || []).map(s => s.toLowerCase())
  const overlap = candidateLangs.filter(l =>
    requiredSkills.some(s => s.includes(l) || l.includes(s))
  )
  score += overlap.length * 15

  const years = (candidate.years_of_experience as number) || 0
  const minYears = (buyerAgent.years_experience_min as number) || 0
  const maxYears = (buyerAgent.years_experience_max as number) || 20
  if (years >= minYears && years <= maxYears + 2) score += 20

  if (candidate.comp_min && buyerAgent.comp_band_max) {
    if ((candidate.comp_min as number) <= (buyerAgent.comp_band_max as number)) score += 15
  }

  if (candidate.visa_sponsorship_required && !buyerAgent.visa_sponsorship_available) {
    return 0
  }

  return Math.min(score, 100)
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function preFilterScore(candidate: any, githubFingerprint: any, posting: any): number {
  let score = 0

  const candidateLangs = [
    ...(githubFingerprint?.primary_languages?.map((l: any) => l.language?.toLowerCase()) || []),
    ...(candidate.primary_languages || candidate.languages || []).map((l: string) => l.toLowerCase()),
  ]
  const postingTech = (posting.parsed_requirements?.tech_stack || []).map((t: string) => t.toLowerCase())
  const overlap = candidateLangs.filter((l: string) => postingTech.includes(l))
  score += overlap.length * 10

  const candidateYears = candidate.years_of_experience || candidate.years_experience || 0
  const postingMin = posting.parsed_requirements?.years_experience_min || 0
  const postingMax = posting.parsed_requirements?.years_experience_max || 20
  if (candidateYears >= postingMin && candidateYears <= postingMax + 2) score += 20

  if (candidate.comp_min && posting.parsed_requirements?.comp_max) {
    if (candidate.comp_min <= posting.parsed_requirements.comp_max) score += 15
  }

  const remotePreference = candidate.remote_preference
  const postingRemote = posting.parsed_requirements?.remote_type
  if (remotePreference === 'remote_only' && postingRemote === 'remote') score += 10
  else if (remotePreference !== 'remote_only') score += 5

  const visaRequired = candidate.visa_sponsorship_required || false
  const visaSupported = posting.parsed_requirements?.visa_sponsorship
  if (visaRequired && !visaSupported) score -= 50

  return Math.max(0, Math.min(100, score))
}

async function runAutonomousAssessment(
  candidate: any,
  githubFingerprint: any,
  posting: any
): Promise<any> {
  const prompt = `You are an autonomous recruiting agent assessing fit between a software engineer and a job opportunity.

Your primary evidence source is the engineer's actual GitHub work, supplemented by their self-reported profile. Weight GitHub evidence heavily.

Be ruthlessly honest. A false positive wastes the candidate's time.

JOB OPPORTUNITY:
Company: ${posting.company_name}
Role: ${posting.title}
Requirements: ${JSON.stringify(posting.parsed_requirements, null, 2)}
Description: ${(posting.raw_description || '').substring(0, 2000)}

CANDIDATE GITHUB FINGERPRINT (primary evidence):
${JSON.stringify(githubFingerprint || {}, null, 2)}

CANDIDATE SELF-REPORTED PROFILE:
Years experience: ${candidate.years_of_experience || candidate.years_experience || 'Unknown'}
Systems built: ${JSON.stringify(candidate.systems_built || [])}
Honest strengths: ${candidate.honest_strengths || candidate.genuine_strengths || 'Not provided'}
Honest gaps: ${candidate.honest_gaps || candidate.genuine_gaps || 'Not provided'}
Remote preference: ${candidate.remote_preference || 'Not specified'}
Comp expectation: $${candidate.comp_min || '?'} - $${candidate.comp_max || '?'}
Visa required: ${candidate.visa_sponsorship_required || false}
Dealbreakers: ${candidate.hard_dealbreakers || candidate.dealbreakers || 'None stated'}

Return ONLY valid JSON:
{
  "overall_fit_score": 0,
  "technical_fit_score": 0,
  "role_fit_score": 0,
  "github_evidence_score": 0,
  "recommendation": "strong_yes|yes|maybe|no",
  "recommendation_summary": "2-3 sentences for the candidate explaining why their agent surfaced this",
  "hiring_team_summary": "2-3 sentences for the recruiter",
  "github_evidence_highlights": [{"requirement": "string", "evidence": "string", "strength": "strong|moderate|weak"}],
  "requirements": [{"requirement": "string", "verdict": "pass|partial|fail", "evidence": "string", "evidence_source": "github|profile|both|none", "confidence": "high|medium|low"}],
  "green_flags": [{"flag": "string", "evidence": "string", "source": "github|profile"}],
  "yellow_flags": [{"flag": "string", "why_matters": "string"}],
  "red_flags": [{"flag": "string", "severity": "minor|significant|dealbreaker"}],
  "compensation_aligned": true,
  "visa_conflict": false,
  "remote_conflict": false,
  "why_candidate_would_want_this": "string",
  "why_candidate_might_not_want_this": "string",
  "open_questions": [],
  "key_evidence": []
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get candidates with completed GitHub ingestion and auto-match enabled
  const { data: githubProfiles } = await supabase
    .from('github_profiles')
    .select('user_id, technical_fingerprint')
    .eq('ingestion_status', 'complete')

  if (!githubProfiles?.length) {
    return NextResponse.json({ matches_created: 0, message: 'No ready candidates' })
  }

  // Get candidate profiles for these users
  const userIds = githubProfiles.map(g => g.user_id)
  const { data: candidateProfiles } = await supabase
    .from('candidate_profiles')
    .select('*')
    .in('user_id', userIds)

  // Get agent settings
  const { data: agentSettings } = await supabase
    .from('agent_settings')
    .select('*')
    .in('user_id', userIds)
    .eq('auto_match_enabled', true)

  const enabledUserIds = new Set(agentSettings?.map(s => s.user_id) || userIds)

  // Get active job postings from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: postings } = await supabase
    .from('job_postings')
    .select('*')
    .eq('is_active', true)
    .gte('created_at', sevenDaysAgo)
    .limit(100)

  if (!postings?.length) {
    return NextResponse.json({ matches_created: 0, message: 'No recent postings' })
  }

  // Get existing matches to avoid duplicates
  const { data: existingMatches } = await supabase
    .from('autonomous_matches')
    .select('candidate_id, job_posting_id')
    .in('candidate_id', userIds)

  const existingPairs = new Set(
    existingMatches?.map(m => `${m.candidate_id}:${m.job_posting_id}`) || []
  )

  let matchesCreated = 0

  for (const cp of candidateProfiles || []) {
    if (!enabledUserIds.has(cp.user_id)) continue

    const github = githubProfiles.find(g => g.user_id === cp.user_id)
    const fingerprint = github?.technical_fingerprint || null
    const settings = agentSettings?.find(s => s.user_id === cp.user_id)
    const threshold = settings?.notification_threshold || 75

    for (const posting of postings) {
      const key = `${cp.user_id}:${posting.id}`
      if (existingPairs.has(key)) continue

      // Pre-filter
      const preScore = preFilterScore(cp, fingerprint, posting)
      if (preScore < 30) continue

      try {
        const report = await runAutonomousAssessment(cp, fingerprint, posting)

        const { data: match } = await supabase
          .from('autonomous_matches')
          .insert({
            candidate_id: cp.user_id,
            job_posting_id: posting.id,
            overall_fit_score: report.overall_fit_score,
            technical_fit_score: report.technical_fit_score,
            role_fit_score: report.role_fit_score,
            github_evidence_score: report.github_evidence_score || 0,
            fit_report: report,
            recommendation: report.recommendation,
            recommendation_summary: report.recommendation_summary,
            match_status: report.overall_fit_score >= threshold ? 'pending_candidate' : 'below_threshold',
            candidate_status: 'pending',
          })
          .select()
          .single()

        existingPairs.add(key)
        matchesCreated++

        // Notify if above threshold
        if (report.overall_fit_score >= threshold && match) {
          await supabase.from('notifications').insert({
            user_id: cp.user_id,
            type: 'new_match',
            title: `Your agent found a strong match: ${posting.title}`,
            body: report.recommendation_summary,
            data: { match_id: match.id, job_posting_id: posting.id },
          })
        }
      } catch (err) {
        console.error(`Match error ${cp.user_id}:${posting.id}`, err)
      }
    }
  }

  return NextResponse.json({ matches_created: matchesCreated })
}

export async function POST(request: NextRequest) {
  return GET(request)
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId } = await request.json()
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })

  // Verify this match belongs to this candidate
  const { data: match } = await admin
    .from('autonomous_matches')
    .select(`
      id,
      candidate_id,
      candidate_prep_data,
      fit_report,
      buyer_agent_id,
      buyer_agents (
        role_title,
        company_name,
        required_skills,
        years_experience_min,
        years_experience_max,
        comp_band_min,
        comp_band_max
      )
    `)
    .eq('id', matchId)
    .eq('candidate_id', user.id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Return cached result if available
  if (match.candidate_prep_data) {
    return NextResponse.json(match.candidate_prep_data)
  }

  // Fetch candidate profile for preferences and dealbreakers
  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('hard_dealbreakers, next_role_priorities, remote_preference, preferred_company_stage, comp_min, comp_max, visa_sponsorship_required')
    .eq('user_id', user.id)
    .single()

  const fitReport = match.fit_report as Record<string, unknown> | null
  const agent = (match.buyer_agents as unknown) as Record<string, unknown> | null

  const screenQuestions: string[] = (fitReport?.questions_for_human_screen as string[]) ?? []
  const yellowFlags = (fitReport?.yellow_flags as Array<{ flag: string; suggested_question?: string }>) ?? []
  const redFlags = (fitReport?.red_flags as Array<{ flag: string; severity: string; reasoning?: string }>) ?? []
  const requirements = (fitReport?.requirements as Array<{ requirement: string; verdict: string; notes?: string }>) ?? []

  const prompt = `You are helping a software engineer candidate prepare for an interview and decide if this role is right for them.

ROLE: ${agent?.role_title} at ${agent?.company_name}
Required skills: ${JSON.stringify(agent?.required_skills)}
Experience range: ${agent?.years_experience_min}–${agent?.years_experience_max} years
Comp band: $${agent?.comp_band_min?.toLocaleString()}–$${agent?.comp_band_max?.toLocaleString()}

FIT ASSESSMENT SUMMARY:
- Overall score: ${fitReport?.overall_fit_score}
- Recommendation: ${fitReport?.recommendation}
- Summary: ${fitReport?.recommendation_summary}

YELLOW FLAGS (uncertainties):
${yellowFlags.map(f => `- ${f.flag}`).join('\n') || 'None'}

RED FLAGS:
${redFlags.map(f => `- [${f.severity}] ${f.flag}: ${f.reasoning || ''}`).join('\n') || 'None'}

PARTIAL/FAIL REQUIREMENTS:
${requirements.filter(r => r.verdict !== 'pass').map(r => `- [${r.verdict}] ${r.requirement}: ${r.notes || ''}`).join('\n') || 'None'}

QUESTIONS THE RECRUITER PLANS TO ASK:
${screenQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') || 'None provided'}

CANDIDATE PREFERENCES AND DEALBREAKERS:
- Hard dealbreakers: ${candidateProfile?.hard_dealbreakers || 'None stated'}
- Next role priorities: ${candidateProfile?.next_role_priorities || 'Not specified'}
- Remote preference: ${candidateProfile?.remote_preference || 'Not specified'}
- Preferred stage: ${JSON.stringify(candidateProfile?.preferred_company_stage) || 'Any'}
- Target comp: $${candidateProfile?.comp_min?.toLocaleString()}–$${candidateProfile?.comp_max?.toLocaleString()}
- Visa required: ${candidateProfile?.visa_sponsorship_required ? 'Yes' : 'No'}

TASK 1 — INTERVIEW PREP:
For each recruiter screen question, reframe it as prep material for the candidate. Be specific about what skill or experience gap prompted the question. Give tactical prep advice.

TASK 2 — QUESTIONS TO ASK:
Generate 3–5 specific questions the candidate should ask the employer to verify this role is right for them. Do NOT generate generic interview questions. Each question must be directly motivated by something specific in the fit report: a yellow flag, a red flag, a partial requirement, or the candidate's stated priorities and dealbreakers. If oncall is uncertain, ask about oncall volume. If management style is a dealbreaker, ask something specific about how this team operates. Make the questions feel like they come from someone who has read this specific assessment.

Return ONLY valid JSON:
{
  "prepare_to_answer": [
    {
      "question": "exact question text from the screen questions",
      "skill_probed": "concise label for the skill or experience area — e.g. 'Distributed Systems', 'Leadership', 'Python at scale'",
      "why_theyll_ask": "one sentence: what gap or uncertainty in your profile prompted this question",
      "how_to_prepare": "2-3 sentences of specific tactical prep advice"
    }
  ],
  "questions_to_ask": [
    {
      "question": "specific question to ask during the interview",
      "why_ask": "one sentence: what this question reveals about the role that matters to you",
      "relates_to": "short tag — e.g. 'oncall', 'management style', 'tech debt', 'growth', 'remote flexibility', 'equity', 'team size'"
    }
  ]
}`

  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = result.content[0].type === 'text' ? result.content[0].text : '{}'
  let prepData: Record<string, unknown>
  try {
    prepData = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 })
  }

  const dataToCache = { ...prepData, generated_at: new Date().toISOString() }

  // Cache on the match row
  await admin
    .from('autonomous_matches')
    .update({ candidate_prep_data: dataToCache })
    .eq('id', matchId)

  return NextResponse.json(dataToCache)
}

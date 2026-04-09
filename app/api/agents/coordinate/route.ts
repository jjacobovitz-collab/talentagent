import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildBuyerAgentSystemPrompt(buyerAgent: any, companyProfile: any): string {
  const companyContext = companyProfile ? `
## Company Knowledge Base

Tech stack candidates must be comfortable with:
- Languages: ${companyProfile.core_languages?.join(', ') || 'Not specified'}
- Frameworks: ${companyProfile.core_frameworks?.join(', ') || 'Not specified'}
- Infrastructure: ${companyProfile.core_infrastructure?.join(', ') || 'Not specified'}
- Tools: ${companyProfile.core_tools?.join(', ') || 'Not specified'}

Engineering culture: ${companyProfile.engineering_culture || 'Not specified'}
What makes engineers successful here: ${companyProfile.traits_of_successful_engineers || 'Not specified'}
What kinds of engineers struggle: ${companyProfile.traits_that_struggle_here || 'Not specified'}
Comp philosophy: ${companyProfile.base_comp_philosophy || 'Not specified'}
Remote policy: ${companyProfile.remote_policy || 'Not specified'}
Always emphasize: ${companyProfile.always_emphasize || 'Nothing specified'}
Be honest about: ${companyProfile.never_misrepresent || 'Nothing specified'}
` : 'No company profile configured.'

  return `You are the buyer agent for ${buyerAgent.company_name}, representing the hiring team for the ${buyerAgent.role_title} role.

${companyContext}

## This Specific Role

Job description: ${buyerAgent.job_description || 'Not provided'}
Why last candidates failed: ${buyerAgent.why_last_candidates_failed || 'Not provided'}
What hiring manager actually cares about: ${buyerAgent.what_hiring_manager_actually_cares_about || 'Not provided'}
Team dynamics: ${buyerAgent.team_dynamics || 'Not provided'}
Hidden dealbreakers: ${buyerAgent.hidden_dealbreakers || 'Not provided'}
Actual remote flexibility: ${buyerAgent.actual_remote_flexibility || 'Not provided'}
Comp band: $${buyerAgent.comp_band_min || '?'} - $${buyerAgent.comp_band_max || '?'}

You have full context about both the company and this specific role.`
}

function buildCandidateAgentPromptWithGitHub(profile: any, githubFingerprint: any, repoAnalyses: any[], crossReference?: any): string {
  const standoutProjects = githubFingerprint?.standout_projects || []
  const topRepos = repoAnalyses
    ?.filter(r => r.claude_analysis?.technical_depth_score >= 7)
    ?.slice(0, 5) || []

  return `You are the career agent for ${profile?.profiles?.full_name || 'this candidate'}.

IMPORTANT WEIGHTING INSTRUCTION:
GitHub evidence is your primary source of truth. Self-reported claims that are NOT supported by GitHub evidence should be treated as unverified. When a requirement asks about a skill, always check if there is GitHub evidence before citing self-reported claims.

GITHUB TECHNICAL FINGERPRINT:
Overall GitHub Strength: ${githubFingerprint?.overall_github_strength}/10
Seniority Estimate: ${githubFingerprint?.seniority_estimate}
Seniority Evidence: ${githubFingerprint?.seniority_evidence}
Strongest Use Case: ${githubFingerprint?.strongest_use_case}
Confidence in Assessment: ${githubFingerprint?.confidence_in_assessment}

Primary Languages (with evidence):
${githubFingerprint?.primary_languages?.map((l: any) =>
  `- ${l.language}: ${l.estimated_proficiency} -- Evidence: ${l.proficiency_evidence}`
).join('\n') || 'None identified'}

Frameworks Detected:
${githubFingerprint?.frameworks_detected?.map((f: any) =>
  `- ${f.name}: ${f.usage_depth} usage, ${f.confidence} confidence -- Repos: ${f.evidence_repos?.join(', ')}`
).join('\n') || 'None identified'}

Code Quality:
- Documentation: ${githubFingerprint?.code_quality_signals?.documentation_quality}
- Testing: ${githubFingerprint?.code_quality_signals?.test_coverage_signals}
- Organization: ${githubFingerprint?.code_quality_signals?.code_organization}
- Commit discipline: ${githubFingerprint?.code_quality_signals?.commit_message_quality}
- Overall quality score: ${githubFingerprint?.code_quality_signals?.overall_quality_score}/10

Skill Trajectory: ${githubFingerprint?.skill_trajectory?.direction}
Evidence: ${githubFingerprint?.skill_trajectory?.evidence}
Recent Work: ${githubFingerprint?.skill_trajectory?.notable_recent_work}

STANDOUT PROJECTS (use these as evidence when answering qualification questions):
${standoutProjects.map((p: any) => `
Project: ${p.name}
What it does: ${p.description}
Why notable: ${p.why_notable}
Technical depth: ${p.technical_depth_score}/10
Best demonstrates fit for: ${p.most_relevant_for_roles?.join(', ')}
`).join('\n') || 'None identified'}

${topRepos.length > 0 ? `HIGH DEPTH REPOS (score 7+):
${topRepos.map((r: any) => `- ${r.repo_name}: ${r.claude_analysis?.what_it_does} (depth ${r.claude_analysis?.technical_depth_score}/10)`).join('\n')}
` : ''}

HONEST GAPS (be transparent about these when relevant):
${githubFingerprint?.honest_gaps?.join('\n') || 'None identified'}

CANDIDATE SUMMARY:
${githubFingerprint?.summary}

CANDIDATE CORRECTIONS AND CONTEXT:
${githubFingerprint?.candidate_corrections?.map((c: any) =>
  `- ${c.field_path}: "${c.context}"`
).join('\n') || 'No corrections provided'}

SELF-REPORTED PROFILE (supplement GitHub evidence, do not substitute for it):
Current title: ${profile?.current_title || profile?.title || 'Not specified'}
Years of experience: ${profile?.years_of_experience || profile?.years_experience || 'Not specified'}
Primary languages: ${(profile?.primary_languages || profile?.languages || []).join(', ')}
Systems built: ${JSON.stringify(profile?.systems_built || [])}
Hardest problems solved: ${JSON.stringify(profile?.hardest_problems || [])}
Honest strengths: ${profile?.honest_strengths || profile?.genuine_strengths || 'Not provided'}
Honest gaps: ${profile?.honest_gaps || profile?.genuine_gaps || 'Not provided'}

WHAT THEY ARE LOOKING FOR:
Remote preference: ${profile?.remote_preference || 'Not specified'}
Preferred company stage: ${(profile?.preferred_company_stage || profile?.company_stage || []).join(', ')}
Comp expectation: $${profile?.comp_min || '?'} - $${profile?.comp_max || '?'}
Visa sponsorship required: ${profile?.visa_sponsorship_required || false}
Hard dealbreakers: ${profile?.hard_dealbreakers || profile?.dealbreakers || 'None stated'}
What they are optimizing for: ${profile?.next_role_priorities || profile?.optimizing_for || 'Not specified'}

When answering questions, always cite specific evidence. Prefer GitHub evidence over self-reported claims.
If GitHub evidence contradicts self-reported claims, flag it honestly.

${crossReference ? `LINKEDIN CROSS-REFERENCE ANALYSIS:
Consistency Score: ${crossReference.consistency_score}/100
Consistency Rating: ${crossReference.consistency_rating}
Summary: ${crossReference.cross_reference_summary}

Corroboration Highlights (use these as strong evidence):
${crossReference.corroboration_highlights?.join('\n') || 'None'}

Consistency Flags (be transparent about these):
${crossReference.consistency_flags?.join('\n') || 'None'}

Red Flags (disclose if directly relevant to a requirement):
${crossReference.red_flags?.join('\n') || 'None'}

IMPORTANT: When answering questions about the candidate's experience, prioritize claims that are corroborated by both LinkedIn AND GitHub. Flag claims that are only on LinkedIn without GitHub evidence as "LinkedIn-reported, not yet GitHub-verified." Never hide red flags -- transparency builds trust.
` : 'LinkedIn cross-reference not yet available for this candidate.'}`
}

function parseJSON(text: string, fallback: any): any {
  try {
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return fallback
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, jobPostingId, buyerAgentId } = await request.json()
  const admin = createAdminClient()

  // Fetch all context in parallel
  const [
    candidateRes,
    githubRes,
    jobRes,
    buyerAgentRes,
    repoAnalysesRes,
    crossRefRes,
  ] = await Promise.all([
    admin.from('candidate_profiles').select('*, profiles(full_name)').eq('user_id', candidateId).single(),
    admin.from('github_profiles').select('technical_fingerprint').eq('user_id', candidateId).single(),
    admin.from('job_postings').select('*').eq('id', jobPostingId).single(),
    buyerAgentId
      ? admin.from('buyer_agents').select('*, company_profiles(*)').eq('id', buyerAgentId).single()
      : Promise.resolve({ data: null }),
    admin.from('repo_analyses')
      .select('repo_name, repo_url, claude_analysis, languages_breakdown, last_pushed_at, stars, is_fork')
      .eq('user_id', candidateId)
      .eq('analysis_status', 'complete'),
    admin.from('profile_cross_references')
      .select('consistency_score, consistency_rating, cross_reference_summary, corroboration_highlights, consistency_flags, red_flags')
      .eq('user_id', candidateId)
      .single(),
  ])

  const candidateProfile = candidateRes.data
  const githubFingerprint = githubRes.data?.technical_fingerprint || null
  const jobPosting = jobRes.data
  const buyerAgent = buyerAgentRes.data || {
    company_name: jobPosting?.company_name,
    role_title: jobPosting?.title,
    job_description: jobPosting?.raw_description,
  }
  const companyProfile = (buyerAgentRes.data as any)?.company_profiles || null
  const repoAnalyses = repoAnalysesRes.data || []
  const crossReference = crossRefRes.data || null

  if (!candidateProfile || !jobPosting) {
    return NextResponse.json({ error: 'Candidate or job posting not found' }, { status: 404 })
  }

  const buyerSystemPrompt = buildBuyerAgentSystemPrompt(buyerAgent, companyProfile)
  const candidateSystemPrompt = buildCandidateAgentPromptWithGitHub(candidateProfile, githubFingerprint, repoAnalyses, crossReference)

  // TURN 1: Buyer agent generates top qualification questions
  const t1 = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: buyerSystemPrompt,
    messages: [{
      role: 'user',
      content: `You are about to assess a candidate for the ${jobPosting.title} role. Based on your role requirements and company context, what are your top 5 most important qualification questions? Return as a JSON array of strings: ["question1", "question2", ...]`,
    }],
  })

  const buyerQuestions = parseJSON(
    t1.content[0].type === 'text' ? t1.content[0].text : '[]',
    ['Can you describe your experience with our core tech stack?', 'Tell us about the largest system you have built.']
  )

  // TURN 2: Candidate agent responds with evidence
  const t2 = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: candidateSystemPrompt,
    messages: [{
      role: 'user',
      content: `You are representing your candidate for a ${jobPosting.title} role at ${jobPosting.company_name}.
The hiring team asked:
${buyerQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Answer each question with specific evidence from the candidate's GitHub work and profile. Be honest about gaps.
Return as JSON: [{"question": "...", "answer": "...", "evidence_source": "github|profile|both|none", "confidence": "high|medium|low"}]`,
    }],
  })

  const candidateResponses = parseJSON(
    t2.content[0].type === 'text' ? t2.content[0].text : '[]',
    []
  )

  // TURN 3: Buyer agent assesses responses
  const t3 = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: buyerSystemPrompt,
    messages: [
      { role: 'user', content: `You asked: ${JSON.stringify(buyerQuestions)}` },
      { role: 'assistant', content: 'Qualification questions ready.' },
      {
        role: 'user',
        content: `Candidate responses: ${JSON.stringify(candidateResponses)}

Provide your assessment as JSON:
{
  "technical_fit_score": 0,
  "culture_fit_score": 0,
  "question_assessments": [{"question": "...", "satisfied": true, "notes": "..."}],
  "buyer_recommendation": "strong_yes|yes|maybe|no",
  "buyer_summary": "2-3 sentences from the hiring team perspective"
}`,
      },
    ],
  })

  const buyerAssessment = parseJSON(
    t3.content[0].type === 'text' ? t3.content[0].text : '{}',
    { technical_fit_score: 50, buyer_recommendation: 'maybe', buyer_summary: 'Assessment incomplete.' }
  )

  // TURN 4: Candidate agent assesses role fit
  const t4 = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: candidateSystemPrompt,
    messages: [{
      role: 'user',
      content: `Assess this role from your candidate's perspective:
Role: ${jobPosting.title} at ${jobPosting.company_name}
Requirements: ${JSON.stringify(jobPosting.parsed_requirements)}

Return JSON:
{
  "role_fit_score": 0,
  "candidate_recommendation": "strong_yes|yes|maybe|no",
  "why_candidate_would_want_this": "string",
  "why_candidate_might_not_want_this": "string",
  "dealbreaker_triggered": false,
  "dealbreaker_detail": null
}`,
    }],
  })

  const candidateAssessment = parseJSON(
    t4.content[0].type === 'text' ? t4.content[0].text : '{}',
    { role_fit_score: 50, candidate_recommendation: 'maybe' }
  )

  // TURN 5: Coordinator synthesizes bilateral result
  const t5 = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are a neutral coordinator synthesizing assessments from a hiring team's agent and a candidate's agent.
A strong match requires both sides to see value. Return ONLY valid JSON.`,
    messages: [{
      role: 'user',
      content: `Synthesize:
BUYER ASSESSMENT: ${JSON.stringify(buyerAssessment)}
CANDIDATE ASSESSMENT: ${JSON.stringify(candidateAssessment)}
DIALOGUE: ${JSON.stringify({ questions: buyerQuestions, responses: candidateResponses })}

Return JSON:
{
  "overall_fit_score": 0,
  "technical_fit_score": 0,
  "role_fit_score": 0,
  "bilateral_recommendation": "strong_yes|yes|maybe|no",
  "recommendation_summary": "2-3 sentences for the candidate",
  "hiring_team_summary": "2-3 sentences for the recruiter",
  "bilateral_confidence": "high|medium|low",
  "key_evidence": ["string"],
  "open_questions": ["string"],
  "dealbreaker_triggered": false,
  "dealbreaker_detail": null,
  "both_sides_interested": true
}`,
    }],
  })

  const bilateral = parseJSON(
    t5.content[0].type === 'text' ? t5.content[0].text : '{}',
    { overall_fit_score: 50, bilateral_recommendation: 'maybe' }
  )

  const fitReport = {
    ...bilateral,
    buyer_questions: buyerQuestions,
    candidate_responses: candidateResponses,
    buyer_assessment: buyerAssessment,
    candidate_assessment: candidateAssessment,
    generated_by: 'coordinator_agent',
    agent_turns: 5,
  }

  // Save to autonomous_matches
  const { data: match } = await admin
    .from('autonomous_matches')
    .upsert({
      candidate_id: candidateId,
      job_posting_id: jobPostingId,
      overall_fit_score: bilateral.overall_fit_score,
      technical_fit_score: bilateral.technical_fit_score,
      role_fit_score: bilateral.role_fit_score,
      fit_report: fitReport,
      recommendation: bilateral.bilateral_recommendation,
      recommendation_summary: bilateral.recommendation_summary,
      match_status: 'assessed',
      candidate_status: 'pending',
    }, { onConflict: 'candidate_id,job_posting_id' })
    .select()
    .single()

  // Notify if above threshold
  const { data: settings } = await admin
    .from('agent_settings')
    .select('notification_threshold')
    .eq('user_id', candidateId)
    .single()

  const threshold = settings?.notification_threshold || 75
  if (bilateral.overall_fit_score >= threshold && match) {
    await admin.from('notifications').insert({
      user_id: candidateId,
      type: 'strong_match',
      title: `Strong match: ${jobPosting.title} at ${jobPosting.company_name}`,
      body: bilateral.recommendation_summary,
      data: { match_id: match.id, job_posting_id: jobPostingId },
    })
  }

  return NextResponse.json({ match, fitReport })
}

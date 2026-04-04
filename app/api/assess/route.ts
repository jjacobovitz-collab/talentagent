import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert technical recruiter and engineering hiring manager with 20 years of experience. You are given a candidate profile and a buyer agent (job specification with hidden context). Your task is to produce a rigorous, honest fit assessment.

You must respond with ONLY valid JSON — no markdown, no explanation, no preamble. The JSON must exactly match this structure:

{
  "overall_fit_score": 0-100,
  "technical_fit_score": 0-100,
  "role_fit_score": 0-100,
  "recommendation": "strong_yes | yes | maybe | no",
  "recommendation_summary": "2-3 sentences plain language",
  "requirements": [
    {
      "requirement": "string",
      "verdict": "pass | partial | fail",
      "evidence": "specific text from candidate profile",
      "confidence": "high | medium | low",
      "notes": "string"
    }
  ],
  "green_flags": [{"flag": "string", "evidence": "string"}],
  "yellow_flags": [{"flag": "string", "suggested_question": "string"}],
  "red_flags": [{"flag": "string", "severity": "minor | significant | dealbreaker", "reasoning": "string"}],
  "compensation_alignment": {"aligned": true, "notes": "string"},
  "visa_flag": false,
  "questions_for_human_screen": ["string"]
}

Be rigorous. Do not inflate scores to be nice. A 70 means genuinely good but with real gaps. A 90+ means exceptional fit. Extract specific evidence from the candidate's actual profile text.`

export async function POST(request: NextRequest) {
  try {
    const { buyerAgentId, candidateProfileId } = await request.json()

    if (!buyerAgentId || !candidateProfileId) {
      return NextResponse.json(
        { error: 'buyerAgentId and candidateProfileId are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch buyer agent
    const { data: agent, error: agentError } = await supabase
      .from('buyer_agents')
      .select('*')
      .eq('id', buyerAgentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Buyer agent not found' }, { status: 404 })
    }

    // Fetch candidate profile
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateProfileId)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 })
    }

    const userPrompt = `
## BUYER AGENT (Role Specification)

Role Title: ${agent.role_title}
Company: ${agent.company_name}

Job Description:
${agent.job_description}

Why Last Candidates Failed:
${agent.why_last_candidates_failed || 'Not specified'}

What Hiring Manager Actually Cares About:
${agent.what_hiring_manager_actually_cares_about || 'Not specified'}

Team Dynamics:
${agent.team_dynamics || 'Not specified'}

Hidden Dealbreakers:
${agent.hidden_dealbreakers || 'Not specified'}

Actual Remote Flexibility:
${agent.actual_remote_flexibility || 'Not specified'}

Compensation Band: $${agent.comp_band_min?.toLocaleString() ?? '?'} – $${agent.comp_band_max?.toLocaleString() ?? '?'}

---

## CANDIDATE PROFILE

Title: ${candidate.title || 'Not specified'}
Years of Experience: ${candidate.years_experience || 'Not specified'}

Languages: ${candidate.languages?.join(', ') || 'Not specified'}
Frameworks: ${candidate.frameworks?.join(', ') || 'Not specified'}
Cloud Platforms: ${candidate.cloud_platforms?.join(', ') || 'Not specified'}

Skill Ratings (1-5 scale):
${candidate.skill_ratings?.map((r: any) => `  ${r.skill}: ${r.rating}/5`).join('\n') || 'Not specified'}

Systems Built:
${candidate.systems_built?.map((s: any, i: number) => `
  System ${i + 1}: ${s.name}
  Description: ${s.description}
  Scale: ${s.scale}
  Architecture Decisions: ${s.architecture_decisions}
  Would Do Differently: ${s.would_do_differently}
`).join('\n') || 'Not specified'}

Hardest Problems:
${candidate.hardest_problems?.map((p: any, i: number) => `
  Problem ${i + 1}: ${p.problem}
  What Made It Hard: ${p.what_made_it_hard}
  How Resolved: ${p.how_resolved}
  Outcome: ${p.outcome}
`).join('\n') || 'Not specified'}

Genuine Strengths: ${candidate.genuine_strengths || 'Not specified'}
Genuine Gaps: ${candidate.genuine_gaps || 'Not specified'}
Problems That Interest Them: ${candidate.problems_interest || 'Not specified'}

Work Preferences:
  Remote: ${candidate.remote_preference || 'Not specified'}
  Company Stage: ${candidate.company_stage?.join(', ') || 'Not specified'}
  Team Size: ${candidate.team_size || 'Not specified'}
  Engineering Culture: ${candidate.engineering_culture || 'Not specified'}
  Management Style: ${candidate.management_style || 'Not specified'}

Role Requirements:
  Target Roles: ${candidate.target_roles?.join(', ') || 'Not specified'}
  Industries: ${candidate.industries?.join(', ') || 'Not specified'}
  Compensation: $${candidate.comp_min?.toLocaleString() ?? '?'} – $${candidate.comp_max?.toLocaleString() ?? '?'}
  Visa Status: ${candidate.visa_status || 'Not specified'}
  Availability: ${candidate.availability || 'Not specified'}
  Dealbreakers: ${candidate.dealbreakers || 'Not specified'}
  Optimizing For: ${candidate.optimizing_for || 'Not specified'}

Produce the fit assessment JSON now.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let assessment
    try {
      // Strip any potential markdown code blocks
      const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
      assessment = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: rawText },
        { status: 500 }
      )
    }

    // Save to fit_assessments table
    const { data: saved, error: saveError } = await supabase
      .from('fit_assessments')
      .insert({
        buyer_agent_id: buyerAgentId,
        candidate_profile_id: candidateProfileId,
        assessment_data: assessment,
        overall_fit_score: assessment.overall_fit_score,
        technical_fit_score: assessment.technical_fit_score,
        role_fit_score: assessment.role_fit_score,
        recommendation: assessment.recommendation,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      // Return assessment even if save fails
      return NextResponse.json({ assessment, saved: false })
    }

    return NextResponse.json({ assessment, id: saved.id, saved: true })
  } catch (error: any) {
    console.error('Assess error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

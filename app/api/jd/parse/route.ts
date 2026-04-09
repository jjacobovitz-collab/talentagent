import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jdText, sourceUrl, companyProfileId } = await request.json()

  if (!jdText || jdText.length < 100) {
    return NextResponse.json({ error: 'Job description too short' }, { status: 400 })
  }

  let companyContext = ''
  if (companyProfileId) {
    const { data: company } = await supabase
      .from('company_profiles')
      .select('company_name, core_languages, core_frameworks, engineering_culture, remote_policy, base_comp_philosophy')
      .eq('id', companyProfileId)
      .single()

    if (company) {
      companyContext = `
Company context (use this to fill gaps in the JD):
- Company: ${company.company_name}
- Known tech stack: ${company.core_languages?.join(', ')} / ${company.core_frameworks?.join(', ')}
- Engineering culture: ${company.engineering_culture}
- Remote policy: ${company.remote_policy}
- Comp philosophy: ${company.base_comp_philosophy}
`
    }
  }

  // Stage 1: Parse the JD
  const parseResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Parse this job description and extract structured data for a recruiting agent. Be precise. If something is not clearly stated in the JD mark it as null rather than guessing.

${companyContext}

JOB DESCRIPTION:
${jdText.substring(0, 6000)}

Return ONLY valid JSON:
{
  "role_title": "string",
  "seniority_level": "junior|mid|senior|staff|principal|director|null",
  "role_category": "backend|frontend|fullstack|devops|data|ml|mobile|other",
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "tech_stack": ["string"],
  "years_experience_min": integer or null,
  "years_experience_max": integer or null,
  "comp_min": integer or null,
  "comp_max": integer or null,
  "remote_type": "remote|hybrid|onsite|flexible|null",
  "visa_sponsorship": true|false|null,
  "key_responsibilities": ["string"],
  "team_context": "string or null",
  "company_name": "string or null",
  "location": "string or null",
  "what_jd_emphasizes": "string -- what does this JD seem to care about most",
  "what_jd_omits": ["string -- important things a good JD should mention but this one does not"],
  "red_flags_in_jd": ["string -- anything in the JD that is a concern: unrealistic requirements, laundry list, etc"]
}`
    }]
  })

  const parseText = parseResult.content[0].type === 'text' ? parseResult.content[0].text : '{}'
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(parseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse JD' }, { status: 500 })
  }

  // Stage 2: Generate targeted follow-up questions
  const questionsResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You just parsed this job description for a recruiting agent. Based on what the JD says and what it omits, generate exactly 3 targeted follow-up questions to ask the recruiter.

These questions should surface the hidden context that makes a buyer agent dramatically smarter:
- Why have past candidates failed at this stage
- What the hiring manager actually cares about that is not in the JD
- Specific dealbreakers or requirements that are implied but not stated
- Scale, team dynamics, or technical depth that the JD skips over

Make each question specific to THIS job description. Do not ask generic questions. Reference specific things from the JD.

Parsed JD data:
${JSON.stringify(parsed, null, 2)}

Return ONLY valid JSON array of exactly 3 questions:
[
  {
    "question": "specific targeted question text",
    "field": "why_last_candidates_failed|what_hiring_manager_actually_cares_about|hidden_dealbreakers|actual_remote_flexibility|team_dynamics|technical_depth|other",
    "why_we_are_asking": "one sentence explanation of why this question matters for matching",
    "placeholder": "example answer to help the recruiter understand what we want"
  }
]`
    }]
  })

  const questionsText = questionsResult.content[0].type === 'text' ? questionsResult.content[0].text : '[]'
  let questions: unknown[] = []
  try {
    questions = JSON.parse(questionsText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim())
  } catch {
    questions = []
  }

  const { data: parseRecord } = await supabase
    .from('jd_parses')
    .insert({
      recruiter_id: user.id,
      raw_jd_text: jdText,
      source_url: sourceUrl,
      parsed_data: parsed,
      follow_up_questions: questions
    })
    .select()
    .single()

  const { data: templates } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('recruiter_id', user.id)
    .eq('role_category', parsed.role_category)
    .eq('seniority_level', parsed.seniority_level)
    .limit(1)

  return NextResponse.json({
    parseId: parseRecord?.id,
    parsed,
    questions,
    suggestedTemplate: templates?.[0] || null
  })
}

// NOTE: Before using PDF upload, run the following SQL in Supabase SQL editor to create the storage bucket:
// insert into storage.buckets (id, name, public) values ('linkedin-pdfs', 'linkedin-pdfs', false);
// create policy "Users upload own linkedin pdf" on storage.objects
//   for insert with check (bucket_id = 'linkedin-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
// create policy "Users read own linkedin pdf" on storage.objects
//   for select using (bucket_id = 'linkedin-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const method = formData.get('method') as string // 'text_paste' or 'pdf_upload'
  const textContent = formData.get('text') as string
  const pdfFile = formData.get('pdf') as File | null

  let rawText = textContent

  // Handle PDF upload
  if (method === 'pdf_upload' && pdfFile) {
    const pdfBytes = await pdfFile.arrayBuffer()
    const base64Pdf = Buffer.from(pdfBytes).toString('base64')

    const pdfExtraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            type: 'text',
            text: 'Extract all text from this LinkedIn profile PDF. Return the raw text content preserving the structure as much as possible. Include all sections: headline, summary, experience, education, skills, certifications, and any other sections present.',
          },
        ],
      }],
    })

    rawText = pdfExtraction.content[0].type === 'text' ? pdfExtraction.content[0].text : ''

    await supabase.storage
      .from('linkedin-pdfs')
      .upload(`${user.id}/profile.pdf`, pdfFile, { upsert: true })
  }

  if (!rawText || rawText.length < 100) {
    return NextResponse.json({ error: 'Insufficient LinkedIn data provided' }, { status: 400 })
  }

  // Update status to parsing
  await supabase.from('linkedin_profiles').upsert({
    user_id: user.id,
    input_method: method,
    raw_text: rawText,
    parse_status: 'parsing',
  }, { onConflict: 'user_id' })

  // Parse with Claude
  const parseResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Parse this LinkedIn profile text and extract structured data. Be precise with dates -- if a month is not specified use null for the month field. For current positions set end_year and end_month to null and is_current to true.

LinkedIn Profile Text:
${rawText.substring(0, 8000)}

Return ONLY valid JSON:
{
  "headline": "string or null",
  "summary": "string or null",
  "location": "string or null",
  "connections_count": integer or null,
  "positions": [
    {
      "company": "string",
      "title": "string",
      "start_month": integer or null,
      "start_year": integer,
      "end_month": integer or null,
      "end_year": integer or null,
      "is_current": boolean,
      "duration_months": integer,
      "description": "string or null",
      "location": "string or null"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string or null",
      "field": "string or null",
      "start_year": integer or null,
      "end_year": integer or null,
      "activities": "string or null"
    }
  ],
  "skills": [
    {
      "skill": "string",
      "endorsement_count": integer or 0
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "date": "string or null"
    }
  ],
  "total_experience_years": number,
  "career_trajectory": "upward|lateral|mixed|unclear",
  "average_tenure_months": number,
  "notable_companies": ["string"]
}`,
    }],
  })

  const parseText = parseResult.content[0].type === 'text' ? parseResult.content[0].text : '{}'
  let parsed: any = {}

  try {
    const cleaned = parseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Failed to parse LinkedIn data' }, { status: 500 })
  }

  // Save parsed data
  await supabase.from('linkedin_profiles').update({
    ...parsed,
    parse_status: 'complete',
    parsed_at: new Date().toISOString(),
  }).eq('user_id', user.id)

  // Trigger cross-reference analysis
  await runCrossReferenceAnalysis(supabase, user.id, parsed)

  // Update onboarding progress
  await supabase.from('onboarding_sessions').upsert({
    user_id: user.id,
    last_active_step: 'linkedin_added',
  }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true, parsed })
}

async function runCrossReferenceAnalysis(supabase: any, userId: string, linkedinData: any) {
  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('technical_fingerprint, repos_analyzed, github_username')
    .eq('user_id', userId)
    .single()

  if (!githubProfile?.technical_fingerprint) return

  const fingerprint = githubProfile.technical_fingerprint

  const crossRefPrompt = `You are analyzing the consistency between a software engineer's LinkedIn employment history and their GitHub activity. Your goal is to surface genuine corroboration, neutral gaps, and potential inconsistencies that a technical recruiter should be aware of.

Be fair and charitable. Many engineers have private repos, work on internal codebases, or contribute to code that is not visible on GitHub. Absence of GitHub evidence during a period is NOT necessarily a red flag -- it is just neutral. Only flag things that are genuinely inconsistent or surprising.

LINKEDIN EMPLOYMENT HISTORY:
${JSON.stringify(linkedinData.positions, null, 2)}

LINKEDIN SKILLS CLAIMED:
${linkedinData.skills?.map((s: any) => s.skill).join(', ')}

GITHUB TECHNICAL FINGERPRINT:
Primary Languages: ${fingerprint.primary_languages?.map((l: any) => `${l.language} (${l.estimated_proficiency})`).join(', ')}
Frameworks: ${fingerprint.frameworks_detected?.map((f: any) => f.name).join(', ')}
Seniority Estimate: ${fingerprint.seniority_estimate}
Skill Trajectory: ${fingerprint.skill_trajectory?.direction}
Notable Recent Work: ${fingerprint.skill_trajectory?.notable_recent_work}
Overall GitHub Strength: ${fingerprint.overall_github_strength}/10

STANDOUT GITHUB PROJECTS:
${fingerprint.standout_projects?.map((p: any) => `- ${p.name}: ${p.description}`).join('\n')}

HONEST GITHUB GAPS:
${fingerprint.honest_gaps?.join(', ')}

Analyze the consistency between these two data sources and return ONLY valid JSON:

{
  "consistency_score": <integer 0-100, where 100 is perfectly consistent>,
  "consistency_rating": "<strong|good|mixed|weak|insufficient_data>",
  "timeline_analysis": [
    {
      "period": "<date range string>",
      "linkedin_claim": "<what they claimed to be doing>",
      "github_evidence": "<what GitHub shows during this period or 'No public GitHub activity detected'>",
      "consistency": "<corroborated|neutral|gap|conflict>",
      "confidence": "<high|medium|low>",
      "notes": "<specific observation>"
    }
  ],
  "skill_analysis": [
    {
      "skill": "<skill name>",
      "linkedin_claimed": true,
      "github_evidence": "<specific evidence or null>",
      "evidence_strength": "<strong|moderate|weak|none>",
      "repos_cited": ["<repo names>"]
    }
  ],
  "seniority_consistency": {
    "linkedin_implied_seniority": "<what their titles suggest>",
    "github_implied_seniority": "<what GitHub suggests>",
    "consistent": <boolean>,
    "notes": "<string>"
  },
  "corroboration_highlights": [
    "<specific positive signal where GitHub strongly corroborates LinkedIn claim>"
  ],
  "consistency_flags": [
    "<something worth probing in a human conversation -- not necessarily a red flag, just a gap or question>"
  ],
  "red_flags": [
    "<genuine concern where LinkedIn claim is directly contradicted by GitHub evidence>"
  ],
  "cross_reference_summary": "<3-4 sentence summary for recruiters explaining the overall consistency picture>",
  "questions_to_ask": [
    "<specific question to ask in human screen based on what you found>"
  ]
}`

  const crossRefResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: crossRefPrompt }],
  })

  const crossRefText = crossRefResult.content[0].type === 'text' ? crossRefResult.content[0].text : '{}'

  try {
    const cleaned = crossRefText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const crossRef = JSON.parse(cleaned)

    await supabase.from('profile_cross_references').upsert({
      user_id: userId,
      ...crossRef,
      analyzed_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch (err) {
    console.error('Cross-reference analysis failed:', err)
  }
}

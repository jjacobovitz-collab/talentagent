import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    parseId,
    parsed,
    questionAnswers,
    companyProfileId,
    rawJdText
  } = await request.json()

  const fieldMapping: Record<string, string> = {}
  for (const answer of (questionAnswers || [])) {
    if (answer.answer && answer.answer.trim()) {
      fieldMapping[answer.field] = answer.answer
    }
  }

  const { data: buyerAgent, error } = await supabase
    .from('buyer_agents')
    .insert({
      recruiter_id: user.id,
      company_profile_id: companyProfileId || null,
      role_title: parsed.role_title,
      company_name: parsed.company_name || 'Not specified',
      job_description: rawJdText,
      required_skills: parsed.required_skills,
      preferred_skills: parsed.preferred_skills,
      years_experience_min: parsed.years_experience_min,
      years_experience_max: parsed.years_experience_max,
      comp_band_min: parsed.comp_min,
      comp_band_max: parsed.comp_max,
      why_last_candidates_failed: fieldMapping.why_last_candidates_failed || null,
      what_hiring_manager_actually_cares_about: fieldMapping.what_hiring_manager_actually_cares_about || null,
      hidden_dealbreakers: fieldMapping.hidden_dealbreakers || null,
      actual_remote_flexibility: fieldMapping.actual_remote_flexibility || null,
      team_dynamics: fieldMapping.team_dynamics || null,
      status: 'active'
    })
    .select()
    .single()

  if (error || !buyerAgent) {
    return NextResponse.json({ error: error?.message || 'Failed to create agent' }, { status: 500 })
  }

  if (parseId) {
    await supabase.from('jd_parses')
      .update({ buyer_agent_id: buyerAgent.id })
      .eq('id', parseId)
  }

  await updateAgentTemplate(supabase, user.id, companyProfileId, parsed, fieldMapping)

  // Fire and forget
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/match/run-for-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    },
    body: JSON.stringify({ buyerAgentId: buyerAgent.id })
  }).catch(() => {})

  return NextResponse.json({ buyerAgent })
}

async function updateAgentTemplate(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  recruiterId: string,
  companyProfileId: string | null,
  parsed: Record<string, unknown>,
  fieldMapping: Record<string, string>
) {
  const { data: existing } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .eq('role_category', parsed.role_category)
    .eq('seniority_level', parsed.seniority_level)
    .maybeSingle()

  if (existing) {
    const combined = [
      ...(existing.common_required_skills || []),
      ...((parsed.required_skills as string[]) || [])
    ]
    const mergedSkills = combined.filter((v, i) => combined.indexOf(v) === i)

    await supabase.from('agent_templates').update({
      common_required_skills: mergedSkills,
      times_used: (existing.times_used || 0) + 1,
      last_used_at: new Date().toISOString()
    }).eq('id', existing.id)
  } else {
    await supabase.from('agent_templates').insert({
      recruiter_id: recruiterId,
      company_profile_id: companyProfileId,
      template_name: `${parsed.seniority_level} ${parsed.role_category} engineer`,
      role_category: parsed.role_category,
      seniority_level: parsed.seniority_level,
      common_required_skills: parsed.required_skills,
      common_preferred_skills: parsed.preferred_skills,
      standard_why_candidates_fail: fieldMapping.why_last_candidates_failed || null,
      standard_hiring_manager_priorities: fieldMapping.what_hiring_manager_actually_cares_about || null,
      times_used: 1,
      last_used_at: new Date().toISOString()
    })
  }
}

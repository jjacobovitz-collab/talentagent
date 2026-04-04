import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoleAssessClient from './RoleAssessClient'

export default async function RoleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agent, error } = await supabase
    .from('buyer_agents')
    .select('id, role_title, company_name, job_description, comp_min, comp_max, actual_remote_flexibility')
    .eq('id', params.id)
    .single()

  if (error || !agent) notFound()

  // Get candidate's own profile
  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('id, title, completion_score')
    .eq('user_id', user!.id)
    .single()

  // Check for existing assessment
  const existingAssessment = candidateProfile
    ? await supabase
        .from('fit_assessments')
        .select('*')
        .eq('buyer_agent_id', params.id)
        .eq('candidate_profile_id', candidateProfile.id)
        .single()
    : null

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/roles" className="hover:text-[#6366F1]">Roles</Link>
        <span>/</span>
        <span className="text-slate-700">{agent.role_title}</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">{agent.role_title}</h1>
        <p className="text-slate-500 mt-1">{agent.company_name}</p>
        <div className="flex gap-4 mt-2">
          {agent.comp_min && agent.comp_max && (
            <span className="text-sm text-slate-500">
              ${(agent.comp_min / 1000).toFixed(0)}k – ${(agent.comp_max / 1000).toFixed(0)}k/yr
            </span>
          )}
          {agent.actual_remote_flexibility && (
            <span className="text-sm text-slate-500">{agent.actual_remote_flexibility}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-3">Job Description</h2>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {agent.job_description}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <RoleAssessClient
            agentId={agent.id}
            candidateProfile={candidateProfile}
            existingAssessment={existingAssessment?.data ?? null}
          />
        </div>
      </div>
    </div>
  )
}

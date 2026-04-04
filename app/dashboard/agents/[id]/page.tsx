import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AgentDetailClient from './AgentDetailClient'

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agent, error } = await supabase
    .from('buyer_agents')
    .select('*')
    .eq('id', params.id)
    .eq('recruiter_id', user!.id)
    .single()

  if (error || !agent) notFound()

  // Fetch all candidate profiles to assess against
  const { data: candidates } = await supabase
    .from('candidate_profiles')
    .select('id, title, years_experience, user_id, completion_score')

  // Fetch existing assessments for this agent
  const { data: assessments } = await supabase
    .from('fit_assessments')
    .select('*')
    .eq('buyer_agent_id', params.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/agents" className="hover:text-[#6366F1]">Buyer Agents</Link>
        <span>/</span>
        <span className="text-slate-700">{agent.role_title}</span>
      </div>

      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{agent.role_title}</h1>
          <p className="text-slate-500 mt-1">{agent.company_name}</p>
          {agent.comp_band_min && agent.comp_band_max && (
            <p className="text-slate-400 text-sm mt-0.5">
              ${(agent.comp_band_min / 1000).toFixed(0)}k – ${(agent.comp_band_max / 1000).toFixed(0)}k
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/agents/${params.id}/edit`}
          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-slate-300 transition-colors"
        >
          Edit Agent
        </Link>
      </div>

      <AgentDetailClient
        agent={agent}
        candidates={candidates ?? []}
        existingAssessments={assessments ?? []}
      />
    </div>
  )
}

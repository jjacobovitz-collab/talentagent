import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MatchQueueClient from '@/app/dashboard/matches/MatchQueueClient'

export default async function AgentMatchesPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agent, error } = await supabase
    .from('buyer_agents')
    .select('id, role_title, company_name, comp_band_min, comp_band_max')
    .eq('id', params.id)
    .eq('recruiter_id', user!.id)
    .single()

  if (error || !agent) notFound()

  const { data: rawMatches } = await admin
    .from('autonomous_matches')
    .select('*, job_postings(*)')
    .eq('buyer_agent_id', params.id)
    .not('match_status', 'eq', 'below_threshold')
    .order('overall_fit_score', { ascending: false })

  const candidateIds = Array.from(
    new Set((rawMatches ?? []).map((m: any) => m.candidate_id).filter(Boolean))
  )

  const matchIds = (rawMatches ?? []).map((m: any) => m.id)

  const [cpRes, crRes, nudgesRes] = await Promise.all([
    candidateIds.length
      ? admin.from('candidate_profiles').select('*, profiles:user_id(full_name, email)').in('user_id', candidateIds)
      : { data: [] },
    candidateIds.length
      ? admin.from('profile_cross_references').select('user_id, consistency_score, consistency_rating, cross_reference_summary, timeline_analysis, questions_to_ask').in('user_id', candidateIds)
      : { data: [] },
    matchIds.length
      ? admin.from('nudges').select('match_id, message, created_at').in('match_id', matchIds)
      : { data: [] },
  ])

  const profileByUserId = Object.fromEntries((cpRes.data ?? []).map((cp: any) => [cp.user_id, cp]))
  const crossRefByUserId = Object.fromEntries((crRes.data ?? []).map((cr: any) => [cr.user_id, cr]))
  const nudgeByMatchId = Object.fromEntries((nudgesRes.data ?? []).map((n: any) => [n.match_id, n]))

  const matches = (rawMatches ?? []).map((m: any) => ({
    ...m,
    candidate_profiles: profileByUserId[m.candidate_id] ?? null,
    cross_reference: crossRefByUserId[m.candidate_id] ?? null,
    nudge: nudgeByMatchId[m.id] ?? null,
  }))

  const pendingCount = matches.filter(m => m.match_status === 'candidate_confirmed').length

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/agents" className="hover:text-[#6366F1]">Buyer Agents</Link>
        <span>/</span>
        <Link href={`/dashboard/agents/${params.id}`} className="hover:text-[#6366F1]">{agent.role_title}</Link>
        <span>/</span>
        <span>Pipeline</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{agent.role_title}</h1>
          <p className="text-slate-500 mt-1">{agent.company_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="bg-[#F59E0B] text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingCount} need{pendingCount === 1 ? 's' : ''} your review
            </span>
          )}
          <Link
            href={`/dashboard/agents/${params.id}/edit`}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-slate-300 transition-colors"
          >
            Edit Agent
          </Link>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-400 text-lg mb-2">No matches yet</p>
          <p className="text-slate-400 text-sm">Your agent is searching the candidate pool. Check back soon.</p>
        </div>
      ) : (
        <MatchQueueClient matches={matches} recruiterId={user!.id} />
      )}
    </div>
  )
}

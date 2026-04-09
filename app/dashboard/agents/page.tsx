import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

const PENDING_REVIEW_STATUSES = ['pending_candidate', 'assessed', 'candidate_confirmed']
const WAITING_STATUSES = ['company_confirmed']
const CONFIRMED_STATUSES = ['mutual_confirmed', 'revealed']
const CONVERSATION_STATUSES = ['in_conversation', 'offer_made']

export default async function AgentsPage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agents } = await supabase
    .from('buyer_agents')
    .select('*')
    .eq('recruiter_id', user!.id)
    .order('created_at', { ascending: false })

  const agentIds = agents?.map((a: any) => a.id) ?? []

  const { data: matchRows } = agentIds.length
    ? await admin
        .from('autonomous_matches')
        .select('id, buyer_agent_id, match_status')
        .in('buyer_agent_id', agentIds)
        .not('match_status', 'eq', 'below_threshold')
    : { data: [] }

  // Group match counts by buyer_agent_id
  const countsByAgent: Record<string, Record<string, number>> = {}
  for (const m of (matchRows ?? [])) {
    if (!countsByAgent[m.buyer_agent_id]) countsByAgent[m.buyer_agent_id] = {}
    countsByAgent[m.buyer_agent_id][m.match_status] = (countsByAgent[m.buyer_agent_id][m.match_status] ?? 0) + 1
  }

  function stageCounts(agentId: string) {
    const c = countsByAgent[agentId] ?? {}
    const entries = Object.entries(c)
    return {
      pendingReview: entries.filter(([s]) => PENDING_REVIEW_STATUSES.includes(s)).reduce((sum, [, n]) => sum + n, 0),
      waiting: entries.filter(([s]) => WAITING_STATUSES.includes(s)).reduce((sum, [, n]) => sum + n, 0),
      confirmed: entries.filter(([s]) => CONFIRMED_STATUSES.includes(s)).reduce((sum, [, n]) => sum + n, 0),
      conversation: entries.filter(([s]) => CONVERSATION_STATUSES.includes(s)).reduce((sum, [, n]) => sum + n, 0),
      needsAction: c['candidate_confirmed'] ?? 0,
      total: entries.reduce((sum, [, n]) => sum + n, 0),
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Buyer Agents</h1>
          <p className="text-slate-500 mt-1">Each agent represents a role you are hiring for.</p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
        >
          + New Agent
        </Link>
      </div>

      {(!agents || agents.length === 0) ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-400 text-lg mb-4">No buyer agents yet</p>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent: any) => {
            const counts = stageCounts(agent.id)
            return (
              <div key={agent.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-[#0F172A]">{agent.role_title}</h3>
                      {counts.needsAction > 0 && (
                        <span className="bg-[#F59E0B] text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                          {counts.needsAction} to review
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{agent.company_name}</p>
                    {agent.comp_band_min && agent.comp_band_max && (
                      <p className="text-slate-400 text-xs mt-0.5">
                        ${(agent.comp_band_min / 1000).toFixed(0)}k – ${(agent.comp_band_max / 1000).toFixed(0)}k
                      </p>
                    )}

                    {counts.total > 0 && (
                      <div className="flex items-center gap-4 mt-3">
                        {counts.pendingReview > 0 && (
                          <span className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{counts.pendingReview}</span> pending review
                          </span>
                        )}
                        {counts.waiting > 0 && (
                          <span className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{counts.waiting}</span> waiting on candidate
                          </span>
                        )}
                        {counts.confirmed > 0 && (
                          <span className="text-xs text-[#10B981]">
                            <span className="font-semibold">{counts.confirmed}</span> confirmed
                          </span>
                        )}
                        {counts.conversation > 0 && (
                          <span className="text-xs text-[#6366F1]">
                            <span className="font-semibold">{counts.conversation}</span> in conversation
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-slate-300 transition-colors"
                    >
                      Settings
                    </Link>
                    <Link
                      href={`/dashboard/agents/${agent.id}/matches`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        counts.needsAction > 0
                          ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
                          : 'bg-[#6366F1] text-white hover:bg-[#5558e8]'
                      }`}
                    >
                      View Pipeline →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

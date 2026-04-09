import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

const PENDING_REVIEW_STATUSES = ['pending_candidate', 'assessed', 'candidate_confirmed']
const CONFIRMED_STATUSES = ['mutual_confirmed', 'revealed']
const CONVERSATION_STATUSES = ['in_conversation', 'offer_made']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_candidate: 'New match',
    assessed: 'Assessed',
    candidate_confirmed: 'Candidate interested',
    company_confirmed: 'You confirmed',
    mutual_confirmed: 'Mutual confirmed',
    revealed: 'Revealed',
    in_conversation: 'In conversation',
    offer_made: 'Offer made',
  }
  return labels[status] ?? status
}

function statusColor(status: string): string {
  if (CONFIRMED_STATUSES.includes(status) || CONVERSATION_STATUSES.includes(status)) return 'text-[#10B981]'
  if (status === 'candidate_confirmed') return 'text-[#F59E0B]'
  return 'text-slate-500'
}

export default async function MatchQueuePage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agentRows } = await admin
    .from('buyer_agents')
    .select('id, role_title, company_name')
    .eq('recruiter_id', user!.id)

  const agentIds = agentRows?.map((a: any) => a.id) ?? []
  const agentById = Object.fromEntries((agentRows ?? []).map((a: any) => [a.id, a]))

  const { data: allMatches } = agentIds.length
    ? await admin
        .from('autonomous_matches')
        .select('id, buyer_agent_id, match_status, overall_fit_score, created_at')
        .in('buyer_agent_id', agentIds)
        .not('match_status', 'eq', 'below_threshold')
        .order('created_at', { ascending: false })
    : { data: [] }

  const matches = allMatches ?? []

  // Summary counts
  const needsActionCount = matches.filter(m => m.match_status === 'candidate_confirmed').length
  const revealedCount = matches.filter(m => CONFIRMED_STATUSES.includes(m.match_status) || CONVERSATION_STATUSES.includes(m.match_status)).length
  const pendingReviewCount = matches.filter(m => PENDING_REVIEW_STATUSES.includes(m.match_status)).length

  // Recent activity: last 20 matches
  const recentActivity = matches.slice(0, 20)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Match Overview</h1>
        <p className="text-slate-500 mt-1">
          Summary across all roles. Visit a role pipeline to review individual matches.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-3xl font-bold text-[#F59E0B]">{needsActionCount}</p>
          <p className="text-sm text-slate-500 mt-1">Pending your confirmation</p>
          <p className="text-xs text-slate-400 mt-0.5">Candidates who confirmed interest</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-3xl font-bold text-[#10B981]">{revealedCount}</p>
          <p className="text-sm text-slate-500 mt-1">Revealed candidates</p>
          <p className="text-xs text-slate-400 mt-0.5">Mutual confirmed or in conversation</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <p className="text-3xl font-bold text-[#6366F1]">{pendingReviewCount}</p>
          <p className="text-sm text-slate-500 mt-1">In review pipeline</p>
          <p className="text-xs text-slate-400 mt-0.5">Across all roles</p>
        </div>
      </div>

      {needsActionCount > 0 && (
        <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/30 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#0F172A]">{needsActionCount} candidate{needsActionCount > 1 ? 's' : ''} waiting for your response</p>
            <p className="text-slate-500 text-sm mt-0.5">Open the role pipeline to confirm or dismiss.</p>
          </div>
          <Link href="/dashboard/agents" className="shrink-0 bg-[#F59E0B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#D97706] transition-colors">
            View roles →
          </Link>
        </div>
      )}

      {/* Recent activity feed */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-[#0F172A] mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-slate-400 text-sm">No matches yet across any role.</p>
        ) : (
          <div className="space-y-0 divide-y divide-slate-50">
            {recentActivity.map((m: any) => {
              const agent = agentById[m.buyer_agent_id]
              return (
                <div key={m.id} className="flex items-center gap-4 py-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                    m.overall_fit_score >= 80 ? 'bg-[#10B981]' : m.overall_fit_score >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                  }`}>
                    {m.overall_fit_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {agent?.role_title ?? 'Unknown role'} · {agent?.company_name ?? ''}
                    </p>
                    <p className={`text-xs ${statusColor(m.match_status)}`}>{statusLabel(m.match_status)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">{timeAgo(m.created_at)}</span>
                    <Link
                      href={`/dashboard/agents/${m.buyer_agent_id}/matches`}
                      className="text-xs text-[#6366F1] hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {agentIds.length > 0 && (
        <div className="mt-6 text-center">
          <Link href="/dashboard/agents" className="text-sm text-[#6366F1] hover:underline">
            View all role pipelines →
          </Link>
        </div>
      )}
    </div>
  )
}

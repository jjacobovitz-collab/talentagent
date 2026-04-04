import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const isCandidate = profile?.role === 'candidate'
  const isRecruiter = profile?.role === 'recruiter'

  let candidateProfile = null
  let githubProfile = null
  let recentMatches: any[] = []
  let agents = null
  let recruiterMatches: any[] = []

  if (isCandidate) {
    const [cpRes, ghRes, matchRes] = await Promise.all([
      supabase.from('candidate_profiles').select('*').eq('user_id', user!.id).single(),
      supabase.from('github_profiles').select('ingestion_status,github_username,repos_analyzed').eq('user_id', user!.id).single(),
      // admin client: RLS has no recruiter read policy on autonomous_matches
      admin.from('autonomous_matches')
        .select('id,overall_fit_score,recommendation,recommendation_summary,match_status,job_postings(title,company_name)')
        .eq('candidate_id', user!.id)
        .neq('match_status', 'candidate_dismissed')
        .order('overall_fit_score', { ascending: false })
        .limit(3),
    ])
    candidateProfile = cpRes.data
    githubProfile = ghRes.data
    recentMatches = matchRes.data ?? []
  }

  if (isRecruiter) {
    const { data: agentList } = await supabase
      .from('buyer_agents').select('*').eq('recruiter_id', user!.id)
    agents = agentList

    const agentIds = agentList?.map((a: any) => a.id) ?? []
    if (agentIds.length) {
      const { data } = await admin
        .from('autonomous_matches')
        .select('id,match_status,overall_fit_score')
        .in('buyer_agent_id', agentIds)
      recruiterMatches = data ?? []
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">
          Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isCandidate ? 'Your agent is working in the background to find great matches.' : 'Create buyer agents to find your perfect candidates.'}
        </p>
      </div>

      {isCandidate && (
        <div className="space-y-6">
          {/* GitHub status */}
          {!githubProfile || githubProfile.ingestion_status === 'pending' ? (
            <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[#0F172A] mb-1">Connect GitHub to activate your agent</h2>
                <p className="text-slate-500 text-sm">Your agent needs to analyze your code to find meaningful matches.</p>
              </div>
              <Link href="/dashboard/github" className="shrink-0 bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors">
                {githubProfile?.ingestion_status === 'pending' ? 'Analyzing...' : 'Connect GitHub'}
              </Link>
            </div>
          ) : (
            <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-[#10B981] text-lg">✓</span>
              <div>
                <p className="text-sm font-medium text-[#0F172A]">GitHub connected — @{githubProfile.github_username}</p>
                <p className="text-xs text-slate-500">{githubProfile.repos_analyzed ?? 0} repositories analyzed · Agent is active</p>
              </div>
              <Link href="/dashboard/github" className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors">Manage</Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile completion */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-[#0F172A] mb-3">Profile</h2>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-[#6366F1]">{candidateProfile?.completion_score ?? 0}</span>
                <span className="text-slate-400 mb-1">/ 100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                <div className="bg-[#6366F1] h-1.5 rounded-full transition-all" style={{ width: `${candidateProfile?.completion_score ?? 0}%` }} />
              </div>
              <Link href="/dashboard/profile" className="text-sm text-[#6366F1] font-medium hover:underline">
                {candidateProfile ? 'Edit profile →' : 'Start profile →'}
              </Link>
            </div>

            {/* Agent stats */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-[#0F172A] mb-3">Your Agent</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{recentMatches.length}</p>
                  <p className="text-xs text-slate-500">Total matches</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#10B981]">
                    {recentMatches.filter(m => m.overall_fit_score >= 80).length}
                  </p>
                  <p className="text-xs text-slate-500">Strong matches (80+)</p>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="font-semibold text-[#0F172A] mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/dashboard/opportunities" className="block text-sm text-[#6366F1] hover:underline">View all opportunities →</Link>
                <Link href="/dashboard/github" className="block text-sm text-[#6366F1] hover:underline">GitHub settings →</Link>
                <Link href="/dashboard/profile" className="block text-sm text-[#6366F1] hover:underline">Update profile →</Link>
              </div>
            </div>
          </div>

          {/* Recent opportunities */}
          {recentMatches.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#0F172A]">Top Matches</h2>
                <Link href="/dashboard/opportunities" className="text-sm text-[#6366F1] hover:underline">See all →</Link>
              </div>
              <div className="space-y-3">
                {recentMatches.map((match: any) => (
                  <div key={match.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${match.overall_fit_score >= 80 ? 'bg-[#10B981]' : match.overall_fit_score >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}>
                      {match.overall_fit_score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{(match.job_postings as any)?.title ?? 'Unknown Role'}</p>
                      <p className="text-xs text-slate-500 truncate">{match.recommendation_summary?.slice(0, 80)}...</p>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                      match.match_status === 'revealed' ? 'bg-[#10B981]/10 text-[#10B981]' :
                      match.match_status === 'candidate_confirmed' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {match.match_status === 'revealed' ? 'Revealed' : match.match_status === 'candidate_confirmed' ? 'Pending' : 'New'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isRecruiter && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-2">Buyer Agents</h2>
            <p className="text-3xl font-bold text-[#6366F1] mb-1">{agents?.length ?? 0}</p>
            <p className="text-slate-500 text-sm mb-4">Active hiring agents</p>
            <Link
              href="/dashboard/agents/new"
              className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
            >
              + New Buyer Agent
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-4">Match Pipeline</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-[#0F172A]">{recruiterMatches.length}</p>
                <p className="text-xs text-slate-500">Total matches</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#10B981]">
                  {recruiterMatches.filter(m => ['revealed', 'mutual_confirmed', 'in_conversation'].includes(m.match_status)).length}
                </p>
                <p className="text-xs text-slate-500">Mutual confirmed</p>
              </div>
            </div>
            <Link href="/dashboard/matches" className="mt-4 block text-sm text-[#6366F1] hover:underline">View match queue →</Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:col-span-2">
            <h2 className="font-semibold text-[#0F172A] mb-3">Recent Agents</h2>
            {agents && agents.length > 0 ? (
              <ul className="space-y-2">
                {agents.slice(0, 5).map((agent: any) => (
                  <li key={agent.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <Link href={`/dashboard/agents/${agent.id}`} className="text-sm text-[#6366F1] hover:underline">
                      {agent.role_title} — {agent.company_name}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {recruiterMatches.filter(m => m.job_id === agent.id).length} matches
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No agents yet. <Link href="/dashboard/agents/new" className="text-[#6366F1] hover:underline">Create your first one</Link></p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MatchQueueClient from './MatchQueueClient'

export default async function MatchQueuePage() {
  // Session client — only used to identify the logged-in user
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Admin client — bypasses RLS so recruiters can read autonomous_matches.
  // Safe here because this is a server component; the service role key never
  // reaches the browser. All data is scoped to this recruiter's buyer agents.
  const admin = createAdminClient()

  // Step 1: get all buyer agents owned by this recruiter
  const { data: agentRows } = await admin
    .from('buyer_agents')
    .select('id')
    .eq('recruiter_id', user!.id)

  const agentIds = agentRows?.map((a: any) => a.id) ?? []

  // Step 2: fetch matches via buyer_agent_id — works regardless of whether
  // recruiter_id is set correctly on the match rows themselves
  const { data: rawMatches } = agentIds.length
    ? await admin
        .from('autonomous_matches')
        .select('*, job_postings(*)')
        .in('buyer_agent_id', agentIds)
        .not('match_status', 'eq', 'below_threshold')
        .order('overall_fit_score', { ascending: false })
    : { data: [] }

  // Step 3: fetch candidate_profiles separately — no direct FK exists between
  // autonomous_matches.candidate_id and candidate_profiles, must join via user_id
  const candidateIds = Array.from(
    new Set((rawMatches ?? []).map((m: any) => m.candidate_id).filter(Boolean))
  )

  const { data: candidateProfiles } = candidateIds.length
    ? await admin
        .from('candidate_profiles')
        .select('*, profiles:user_id(full_name, email)')
        .in('user_id', candidateIds)
    : { data: [] }

  const { data: crossReferences } = candidateIds.length
    ? await admin
        .from('profile_cross_references')
        .select('user_id, consistency_score, consistency_rating, cross_reference_summary, timeline_analysis, questions_to_ask')
        .in('user_id', candidateIds)
    : { data: [] }

  const profileByUserId = Object.fromEntries(
    (candidateProfiles ?? []).map((cp: any) => [cp.user_id, cp])
  )
  const crossRefByUserId = Object.fromEntries(
    (crossReferences ?? []).map((cr: any) => [cr.user_id, cr])
  )

  // Step 4: merge candidate_profiles and cross_references onto each match
  const matches = (rawMatches ?? []).map((m: any) => ({
    ...m,
    candidate_profiles: profileByUserId[m.candidate_id] ?? null,
    cross_reference: crossRefByUserId[m.candidate_id] ?? null,
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Match Queue</h1>
        <p className="text-slate-500 mt-1">
          Anonymized candidates matched to your roles. Confirm interest to reveal.
        </p>
      </div>
      <MatchQueueClient matches={matches} recruiterId={user!.id} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpportunitiesFeed from './OpportunitiesFeed'

export default async function OpportunitiesPage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  // admin client: RLS on autonomous_matches lacks a recruiter read policy;
  // using admin here ensures this page also works if RLS tightens further
  const { data: rawMatches } = await admin
    .from('autonomous_matches')
    .select('*, job_postings(*)')
    .eq('candidate_id', user!.id)
    .not('match_status', 'in', '("below_threshold","candidate_dismissed","company_dismissed")')
    .order('overall_fit_score', { ascending: false })

  // Fetch trust scores for recruiters who have matches with this candidate
  const recruiterIds = Array.from(new Set((rawMatches ?? []).map((m: any) => m.recruiter_id).filter(Boolean)))
  const { data: trustScores } = recruiterIds.length
    ? await supabase
        .from('trust_scores')
        .select('entity_id,overall_score,total_ratings,ratings_threshold_met')
        .in('entity_id', recruiterIds)
        .eq('entity_type', 'company')
    : { data: [] }

  const trustByRecruiter = Object.fromEntries((trustScores ?? []).map((t: any) => [t.entity_id, t]))

  const matches = (rawMatches ?? []).map((m: any) => ({
    ...m,
    trust_score: trustByRecruiter[m.recruiter_id]
      ? {
          average_rating: trustByRecruiter[m.recruiter_id].overall_score,
          total_ratings: trustByRecruiter[m.recruiter_id].total_ratings,
          ratings_threshold_met: trustByRecruiter[m.recruiter_id].ratings_threshold_met,
        }
      : null,
  }))

  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('ingestion_status, last_synced_at')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Your Opportunities</h1>
          <p className="text-slate-500 mt-1">
            Matches your agent found. Anonymized until both sides confirm interest.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${githubProfile?.ingestion_status === 'complete' ? 'bg-[#10B981]' : githubProfile?.ingestion_status === 'ingesting' ? 'bg-[#F59E0B] animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-sm text-slate-500">
            Agent {githubProfile?.ingestion_status === 'complete' ? 'active' : githubProfile?.ingestion_status === 'ingesting' ? 'syncing' : 'setup needed'}
          </span>
        </div>
      </div>

      <OpportunitiesFeed matches={matches ?? []} githubConnected={!!githubProfile} />
    </div>
  )
}

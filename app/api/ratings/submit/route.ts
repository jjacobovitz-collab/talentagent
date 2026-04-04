import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function recalculateTrustScore(admin: any, matchId: string, raterRole: string) {
  const { data: match } = await admin
    .from('autonomous_matches')
    .select('candidate_id, recruiter_id')
    .eq('id', matchId)
    .single()

  if (!match) return

  // If recruiter rated, update candidate's trust score
  // If candidate rated, update company/recruiter's trust score
  const entityId = raterRole === 'recruiter' ? match.candidate_id : match.recruiter_id
  const entityType = raterRole === 'recruiter' ? 'candidate' : 'company'

  // Get all ratings for this entity
  let ratingsQuery = admin.from('match_ratings').select('*')
  if (raterRole === 'recruiter') {
    // All recruiter ratings of this candidate
    ratingsQuery = ratingsQuery.eq('rater_role', 'recruiter')
    const { data: candidateMatches } = await admin
      .from('autonomous_matches')
      .select('id')
      .eq('candidate_id', entityId)
    const matchIds = candidateMatches?.map((m: any) => m.id) || []
    if (matchIds.length === 0) return
    ratingsQuery = ratingsQuery.in('match_id', matchIds)
  } else {
    ratingsQuery = ratingsQuery.eq('rater_role', 'candidate')
    const { data: recruiterMatches } = await admin
      .from('autonomous_matches')
      .select('id')
      .eq('recruiter_id', entityId)
    const matchIds = recruiterMatches?.map((m: any) => m.id) || []
    if (matchIds.length === 0) return
    ratingsQuery = ratingsQuery.in('match_id', matchIds)
  }

  const { data: ratings } = await ratingsQuery

  if (!ratings?.length) return

  const avg = (field: string) => {
    const values = ratings.filter((r: any) => r[field] != null).map((r: any) => r[field])
    return values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null
  }

  await admin.from('trust_scores').upsert({
    entity_id: entityId,
    entity_type: entityType,
    overall_score: avg('overall_match_quality'),
    assessment_accuracy_score: avg('assessment_accuracy'),
    skills_accuracy_score: avg('skills_accuracy'),
    profile_honesty_score: avg('profile_honesty'),
    culture_accuracy_score: avg('company_culture_accuracy'),
    role_accuracy_score: avg('role_accuracy'),
    total_ratings: ratings.length,
    ratings_threshold_met: ratings.length >= 5,
    last_calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'entity_id,entity_type' })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, ratingStage, ratings, qualitative, outcome } = await request.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()

  await admin.from('match_ratings').upsert({
    match_id: matchId,
    rater_id: user.id,
    rater_role: profile?.role,
    rating_stage: ratingStage,
    ...(ratings || {}),
    ...(qualitative || {}),
    outcome: outcome || null,
    is_private: true,
  }, { onConflict: 'match_id,rater_id,rating_stage' })

  await recalculateTrustScore(admin, matchId, profile?.role || 'candidate')

  return NextResponse.json({ success: true })
}

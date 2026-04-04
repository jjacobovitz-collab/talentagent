import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAnonymizedCompanyView, buildAnonymizedCandidateView, isRevealed } from '@/lib/utils/anonymize'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const admin = createAdminClient()
  const { data: match } = await admin
    .from('autonomous_matches')
    .select(`
      *,
      job_postings(*),
      candidate_profiles:candidate_id(*, profiles(full_name, email)),
      github_profiles:candidate_id(technical_fingerprint)
    `)
    .eq('id', params.id)
    .single()

  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const revealed = isRevealed(match.match_status)
  const jobPosting = match.job_postings
  const candidateProfile = match.candidate_profiles
  const githubFingerprint = (match.github_profiles as any)?.technical_fingerprint

  if (profile?.role === 'candidate') {
    // Candidate can only see their own matches
    if (match.candidate_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      match: {
        id: match.id,
        match_status: match.match_status,
        fit_report: match.fit_report,
        overall_fit_score: match.overall_fit_score,
        recommendation: match.recommendation,
        recommendation_summary: match.recommendation_summary,
        candidate_confirmation_status: match.candidate_confirmation_status,
        company_confirmation_status: match.company_confirmation_status,
        outreach_email_draft: revealed ? match.outreach_email_draft : null,
        company: revealed
          ? {
              name: jobPosting?.company_name,
              website: jobPosting?.company_website,
              role_title: jobPosting?.title,
              location: jobPosting?.location,
            }
          : buildAnonymizedCompanyView(jobPosting || {}, null, match.fit_report),
      },
    })
  }

  if (profile?.role === 'recruiter') {
    // Recruiter can only see matches for their roles
    if (match.recruiter_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      match: {
        id: match.id,
        match_status: match.match_status,
        fit_report: match.fit_report,
        overall_fit_score: match.overall_fit_score,
        recommendation: match.recommendation,
        candidate_confirmation_status: match.candidate_confirmation_status,
        company_confirmation_status: match.company_confirmation_status,
        candidate: revealed
          ? {
              name: (candidateProfile as any)?.profiles?.full_name,
              email: (candidateProfile as any)?.profiles?.email,
              profile: candidateProfile,
              github: { technical_fingerprint: githubFingerprint },
            }
          : buildAnonymizedCandidateView(candidateProfile || {}, githubFingerprint, match.fit_report),
      },
    })
  }

  return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
}

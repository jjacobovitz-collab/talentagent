import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchAllRepos,
  scoreAndRankRepos,
  fetchRepoDetails,
  analyzeRepoWithClaude,
  synthesizeFingerprint,
  updateOnboardingProgress
} from '@/lib/github/ingestion'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const body = await request.json()

  let supabase: any
  let userId: string | null = null
  let githubProfileId: string | null = null

  // Auth pattern 1: CRON_SECRET (called by sync route)
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    supabase = createAdminClient()
    userId = body.userId

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Look up github_profiles to get the profile ID
    const { data: gp } = await supabase
      .from('github_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!gp) {
      return NextResponse.json({ error: 'GitHub profile not found' }, { status: 404 })
    }

    githubProfileId = gp.id

  // Auth pattern 2: User session (called from onboarding UI)
  } else {
    supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    userId = user.id
    githubProfileId = body.githubProfileId

    if (!githubProfileId) {
      return NextResponse.json({ error: 'githubProfileId required' }, { status: 400 })
    }
  }

  // Fetch the GitHub profile with access token
  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('*')
    .eq('id', githubProfileId)
    .eq('user_id', userId)
    .single()

  if (!githubProfile?.github_access_token) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
  }

  // Update status to ingesting
  await supabase.from('github_profiles').update({
    ingestion_status: 'ingesting',
    ingestion_started_at: new Date().toISOString()
  }).eq('id', githubProfileId)

  try {
    // Stage 1: Discover and rank repos
    const allRepos = await fetchAllRepos(githubProfile.github_access_token, githubProfile.github_username)
    const rankedRepos = scoreAndRankRepos(allRepos)
    const topRepos = rankedRepos.slice(0, 15)

    // Save repo stubs
    for (const repo of topRepos) {
      await supabase.from('repo_analyses').upsert({
        github_profile_id: githubProfileId,
        user_id: userId,
        repo_name: repo.name,
        repo_full_name: repo.full_name,
        repo_url: repo.html_url,
        repo_description: repo.description,
        primary_language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        is_fork: repo.fork,
        is_private: repo.private,
        created_at_github: repo.created_at,
        last_pushed_at: repo.pushed_at,
        analysis_status: 'pending'
      }, { onConflict: 'github_profile_id,repo_full_name' })
    }

    // Stage 2 + 3: Fetch details and analyze in parallel batches (max 5 concurrent)
    const batchSize = 5
    for (let i = 0; i < topRepos.length; i += batchSize) {
      const batch = topRepos.slice(i, i + batchSize)
      await Promise.all(batch.map(async (repo: any) => {
        try {
          // Fetch raw details
          const details = await fetchRepoDetails(
            githubProfile.github_access_token,
            githubProfile.github_username,
            repo.name,
            repo.full_name
          )

          // Save raw data and mark as analyzing
          await supabase.from('repo_analyses').update({
            readme_content: details.readme,
            recent_commits: details.commits,
            file_structure: details.fileStructure,
            languages_breakdown: details.languages,
            pull_requests_sample: details.pullRequests,
            commit_count: details.commitCount,
            analysis_status: 'analyzing'
          }).eq('github_profile_id', githubProfileId)
            .eq('repo_full_name', repo.full_name)

          // Analyze with Claude
          const analysis = await analyzeRepoWithClaude(repo, details)

          // Save analysis result
          await supabase.from('repo_analyses').update({
            claude_analysis: analysis,
            analysis_status: 'complete',
            analyzed_at: new Date().toISOString()
          }).eq('github_profile_id', githubProfileId)
            .eq('repo_full_name', repo.full_name)

        } catch {
          await supabase.from('repo_analyses').update({
            analysis_status: 'failed'
          }).eq('github_profile_id', githubProfileId)
            .eq('repo_full_name', repo.full_name)
        }
      }))
    }

    // Stage 4: Synthesize fingerprint from completed analyses
    const { data: completedAnalyses } = await supabase
      .from('repo_analyses')
      .select('*')
      .eq('github_profile_id', githubProfileId)
      .eq('analysis_status', 'complete')

    const fingerprint = await synthesizeFingerprint(
      githubProfile,
      completedAnalyses || []
    )

    // Save fingerprint — store count not array for repos_analyzed
    await supabase.from('github_profiles').update({
      technical_fingerprint: fingerprint,
      repos_analyzed: completedAnalyses?.length ?? 0,
      ingestion_status: 'complete',
      ingestion_completed_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    }).eq('id', githubProfileId)

    // Update onboarding progress
    if (userId) await updateOnboardingProgress(supabase, userId, { github_ingested: true })

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'github_sync_complete',
      title: 'Your GitHub profile has been analyzed',
      body: `Your agent analyzed ${completedAnalyses?.length || 0} repositories and built your technical fingerprint. Review it now to make sure it represents you accurately.`,
      data: { github_profile_id: githubProfileId }
    })

    return NextResponse.json({
      success: true,
      fingerprint,
      repos_analyzed: completedAnalyses?.length || 0
    })

  } catch (error: any) {
    console.error('Ingest error:', error)
    await supabase.from('github_profiles').update({
      ingestion_status: 'failed'
    }).eq('id', githubProfileId)

    return NextResponse.json({ error: error.message || 'Ingestion failed' }, { status: 500 })
  }
}

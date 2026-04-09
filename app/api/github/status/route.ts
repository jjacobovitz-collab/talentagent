import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('ingestion_status, public_repos_count')
    .eq('user_id', user.id)
    .single()

  const { data: repoAnalyses } = await supabase
    .from('repo_analyses')
    .select('repo_name, analysis_status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    ingestion_status: githubProfile?.ingestion_status,
    total_repos: githubProfile?.public_repos_count,
    repos_selected: repoAnalyses?.length || 0,
    repos_complete: repoAnalyses?.filter(r => r.analysis_status === 'complete').length || 0,
    repos_in_progress: repoAnalyses?.filter(r => r.analysis_status === 'analyzing').length || 0,
    repo_statuses: repoAnalyses?.map(r => ({ name: r.repo_name, status: r.analysis_status })) || []
  })
}

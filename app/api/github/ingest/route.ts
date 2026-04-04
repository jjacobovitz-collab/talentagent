import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildGithubAnalysisPrompt(githubData: any): string {
  return `You are analyzing a software engineer's GitHub profile to build a detailed technical fingerprint. This fingerprint will be used by an AI agent to match them to relevant job opportunities.

Be honest and evidence-based. Do not inflate assessments. If the evidence is thin, say so.

GitHub Profile Data:
${JSON.stringify(githubData, null, 2)}

Analyze this data and return ONLY valid JSON matching this exact structure:

{
  "primary_languages": [
    {
      "language": "string",
      "proficiency_evidence": "specific evidence from repos/commits",
      "estimated_proficiency": "beginner|intermediate|advanced|expert",
      "lines_of_code_estimate": "low|medium|high",
      "repo_count": 0,
      "recency": "active|recent|older"
    }
  ],
  "frameworks_detected": [
    {
      "name": "string",
      "evidence_repos": ["repo names"],
      "confidence": "high|medium|low",
      "usage_depth": "surface|moderate|deep"
    }
  ],
  "architecture_patterns": [
    {
      "pattern": "string",
      "evidence": "specific repos or commits",
      "description": "what this tells us about how they build"
    }
  ],
  "code_quality_signals": {
    "documentation_quality": "poor|fair|good|excellent",
    "documentation_evidence": "string",
    "test_coverage_signals": "none|minimal|moderate|strong",
    "test_evidence": "string",
    "commit_message_quality": "poor|fair|good|excellent",
    "commit_evidence": "string",
    "code_organization": "poor|fair|good|excellent",
    "organization_evidence": "string"
  },
  "problem_domains": [
    {
      "domain": "string",
      "evidence": "specific repos",
      "depth": "surface|moderate|deep"
    }
  ],
  "collaboration_signals": {
    "open_source_contributions": "none|minimal|moderate|significant",
    "contribution_evidence": "string",
    "code_review_activity": "none|minimal|moderate|active",
    "issue_engagement": "none|minimal|moderate|active"
  },
  "skill_trajectory": {
    "direction": "improving|consistent|mixed|declining",
    "evidence": "what in the commit history supports this",
    "notable_recent_work": "string"
  },
  "standout_projects": [
    {
      "name": "string",
      "url": "string",
      "description": "what it does and why it stands out",
      "why_notable": "specific technical reason this is impressive",
      "technical_depth_score": 7,
      "most_relevant_for_roles": ["role types this project demonstrates fit for"]
    }
  ],
  "honest_gaps": ["specific gap with evidence"],
  "red_flags": ["anything concerning"],
  "summary": "2-3 sentence plain language summary",
  "seniority_estimate": "junior|mid|senior|staff|principal",
  "seniority_evidence": "what in the profile supports this estimate",
  "strongest_use_case": "the type of role and company this engineer is best suited for"
}`
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const supabase = createAdminClient()

  // Allow CRON_SECRET or user session
  let userId: string | null = null

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    const body = await request.json()
    userId = body.userId
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!githubProfile || !githubProfile.github_access_token) {
    return NextResponse.json({ error: 'GitHub profile not found' }, { status: 404 })
  }

  // Update status to ingesting
  await supabase.from('github_profiles').update({
    ingestion_status: 'ingesting',
    ingestion_started_at: new Date().toISOString(),
  }).eq('user_id', userId)

  const token = githubProfile.github_access_token
  const username = githubProfile.github_username

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  try {
    // Fetch repos
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=100&type=owner`,
      { headers: ghHeaders }
    )
    const allRepos: any[] = await reposRes.json()

    if (!Array.isArray(allRepos)) {
      throw new Error('Failed to fetch repos: ' + JSON.stringify(allRepos))
    }

    // Take top 30 by recency + stars
    const repos = allRepos
      .filter(r => !r.fork)
      .sort((a, b) => {
        const score = (r: any) => r.stargazers_count * 2 + (r.pushed_at ? 1 : 0)
        return score(b) - score(a)
      })
      .slice(0, 30)

    const analyzedRepos = []

    for (const repo of repos) {
      const repoData: any = {
        name: repo.name,
        url: repo.html_url,
        description: repo.description || '',
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        last_commit: repo.pushed_at,
        topics: repo.topics || [],
      }

      // Fetch languages
      try {
        const langsRes = await fetch(repo.languages_url, { headers: ghHeaders })
        repoData.languages = await langsRes.json()
      } catch { repoData.languages = {} }

      // Fetch recent commits
      try {
        const commitsRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/commits?per_page=5`,
          { headers: ghHeaders }
        )
        const commits = await commitsRes.json()
        if (Array.isArray(commits)) {
          repoData.recent_commit_messages = commits
            .slice(0, 5)
            .map((c: any) => c.commit?.message?.split('\n')[0])
            .filter(Boolean)
        }
      } catch { repoData.recent_commit_messages = [] }

      // Fetch README (truncated)
      try {
        const readmeRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/readme`,
          { headers: ghHeaders }
        )
        if (readmeRes.ok) {
          const readmeData = await readmeRes.json()
          if (readmeData.content) {
            const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8')
            repoData.readme_snippet = decoded.substring(0, 500)
          }
        }
      } catch { /* no readme */ }

      analyzedRepos.push(repoData)
    }

    // Fetch public events for contribution signals
    let events: any[] = []
    try {
      const eventsRes = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=30`,
        { headers: ghHeaders }
      )
      events = await eventsRes.json()
      if (!Array.isArray(events)) events = []
    } catch { events = [] }

    // Fetch orgs
    let orgs: any[] = []
    try {
      const orgsRes = await fetch('https://api.github.com/user/orgs', { headers: ghHeaders })
      orgs = await orgsRes.json()
      if (!Array.isArray(orgs)) orgs = []
    } catch { orgs = [] }

    const githubDataForClaude = {
      username,
      public_repos: githubProfile.public_repos_count,
      followers: githubProfile.followers,
      account_created: githubProfile.account_created_at,
      repositories: analyzedRepos,
      recent_public_events: events.slice(0, 20).map((e: any) => ({
        type: e.type,
        repo: e.repo?.name,
        created_at: e.created_at,
      })),
      organizations: orgs.map((o: any) => o.login),
    }

    // Call Claude for fingerprint analysis
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: buildGithubAnalysisPrompt(githubDataForClaude),
      }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const fingerprint = JSON.parse(cleaned)

    // Update github_profiles with fingerprint
    await supabase.from('github_profiles').update({
      technical_fingerprint: fingerprint,
      repos_analyzed: analyzedRepos,
      ingestion_status: 'complete',
      ingestion_completed_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }).eq('user_id', userId)

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'github_sync_complete',
      title: 'GitHub analysis complete',
      body: 'Your technical fingerprint is ready. Your agent is now actively matching you to opportunities.',
      data: {},
    })

    return NextResponse.json({ success: true, repos_analyzed: analyzedRepos.length })
  } catch (error: any) {
    console.error('Ingest error:', error)
    await supabase.from('github_profiles').update({
      ingestion_status: 'failed',
    }).eq('user_id', userId)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// SQL: Run this in Supabase SQL editor before using this module
//
// SQL: create table public.repo_analyses (
// SQL:   id uuid default gen_random_uuid() primary key,
// SQL:   github_profile_id uuid references public.github_profiles(id) on delete cascade not null,
// SQL:   user_id uuid references public.profiles(id) on delete cascade not null,
// SQL:   repo_name text not null,
// SQL:   repo_full_name text not null,
// SQL:   repo_url text not null,
// SQL:   repo_description text,
// SQL:   primary_language text,
// SQL:   languages jsonb default '{}',
// SQL:   stars integer default 0,
// SQL:   forks integer default 0,
// SQL:   is_fork boolean default false,
// SQL:   is_private boolean default false,
// SQL:   created_at_github timestamp with time zone,
// SQL:   last_pushed_at timestamp with time zone,
// SQL:   commit_count integer,
// SQL:   contributor_count integer,
// SQL:   open_issues_count integer,
// SQL:   readme_content text,
// SQL:   recent_commits jsonb default '[]',
// SQL:   file_structure jsonb default '[]',
// SQL:   languages_breakdown jsonb default '{}',
// SQL:   pull_requests_sample jsonb default '[]',
// SQL:   claude_analysis jsonb default '{}',
// SQL:   analysis_status text default 'pending' check (analysis_status in ('pending', 'analyzing', 'complete', 'failed', 'skipped')),
// SQL:   skip_reason text,
// SQL:   analyzed_at timestamp with time zone,
// SQL:   unique(github_profile_id, repo_full_name),
// SQL:   created_at timestamp with time zone default timezone('utc'::text, now()) not null
// SQL: );
//
// SQL: create table public.onboarding_sessions (
// SQL:   id uuid default gen_random_uuid() primary key,
// SQL:   user_id uuid references public.profiles(id) on delete cascade not null unique,
// SQL:   github_connected boolean default false,
// SQL:   github_ingested boolean default false,
// SQL:   fingerprint_reviewed boolean default false,
// SQL:   basics_complete boolean default false,
// SQL:   preferences_complete boolean default false,
// SQL:   video_uploaded boolean default false,
// SQL:   case_study_complete boolean default false,
// SQL:   profile_strength integer default 0 check (profile_strength between 0 and 100),
// SQL:   agent_readiness text default 'not_ready' check (agent_readiness in ('not_ready','basic','good','strong','exceptional')),
// SQL:   last_active_step text,
// SQL:   last_active_at timestamp with time zone,
// SQL:   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
// SQL:   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// SQL: );
//
// SQL: create table public.candidate_signals (
// SQL:   id uuid default gen_random_uuid() primary key,
// SQL:   user_id uuid references public.profiles(id) on delete cascade not null,
// SQL:   linkedin_url text,
// SQL:   linkedin_raw_text text,
// SQL:   linkedin_parsed jsonb default '{}',
// SQL:   stackoverflow_url text,
// SQL:   stackoverflow_reputation integer,
// SQL:   stackoverflow_parsed jsonb default '{}',
// SQL:   portfolio_url text,
// SQL:   portfolio_summary text,
// SQL:   video_url text,
// SQL:   video_transcript text,
// SQL:   video_duration_seconds integer,
// SQL:   case_study_prompt text,
// SQL:   case_study_response text,
// SQL:   case_study_analysis jsonb default '{}',
// SQL:   linkedin_github_consistency_score integer,
// SQL:   consistency_flags jsonb default '[]',
// SQL:   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
// SQL:   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
// SQL: );
//
// SQL: alter table public.repo_analyses enable row level security;
// SQL: alter table public.onboarding_sessions enable row level security;
// SQL: alter table public.candidate_signals enable row level security;
//
// SQL: create policy "Users manage own repo analyses" on public.repo_analyses for all using (auth.uid() = user_id);
// SQL: create policy "Users manage own onboarding" on public.onboarding_sessions for all using (auth.uid() = user_id);
// SQL: create policy "Users manage own signals" on public.candidate_signals for all using (auth.uid() = user_id);
//
// SQL: create policy "Recruiters can view repo analyses" on public.repo_analyses for select using (
// SQL:   exists (select 1 from public.profiles where id = auth.uid() and role = 'recruiter')
// SQL: );
//
// SQL: create trigger handle_onboarding_sessions_updated_at before update on public.onboarding_sessions
// SQL:   for each row execute procedure public.handle_updated_at();
// SQL: create trigger handle_candidate_signals_updated_at before update on public.candidate_signals
// SQL:   for each row execute procedure public.handle_updated_at();

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// -------------------------------------------------------
// STAGE 1: REPO DISCOVERY AND RANKING
// -------------------------------------------------------

export async function fetchAllRepos(accessToken: string, username: string) {
  const allRepos: any[] = []
  let page = 1

  while (true) {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?sort=pushed&per_page=100&page=${page}`,
      { headers: { Authorization: `token ${accessToken}`, 'User-Agent': 'TalentAgent' } }
    )

    if (!response.ok) break
    const repos = await response.json()
    if (repos.length === 0) break

    allRepos.push(...repos)
    if (repos.length < 100) break
    page++
  }

  return allRepos
}

export function scoreAndRankRepos(repos: any[]): any[] {
  return repos
    .filter(repo => !repo.archived)
    .map(repo => ({
      ...repo,
      relevance_score: calculateRelevanceScore(repo)
    }))
    .sort((a, b) => b.relevance_score - a.relevance_score)
}

function calculateRelevanceScore(repo: any): number {
  let score = 0

  // Recency (most important signal -- what are they working on NOW)
  const daysSinceLastPush = (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceLastPush < 30) score += 40
  else if (daysSinceLastPush < 90) score += 30
  else if (daysSinceLastPush < 180) score += 20
  else if (daysSinceLastPush < 365) score += 10

  // Stars (social proof of quality)
  score += Math.min(repo.stargazers_count * 2, 20)

  // Not a fork (original work is more valuable)
  if (!repo.fork) score += 15

  // Has a description (indicates intentional project)
  if (repo.description) score += 5

  // Has a language identified
  if (repo.language) score += 5

  // Size (not too small, not too large)
  if (repo.size > 100 && repo.size < 100000) score += 5

  // Has open issues (active project)
  if (repo.open_issues_count > 0) score += 5

  // Has watchers
  score += Math.min(repo.watchers_count, 5)

  return score
}

// -------------------------------------------------------
// STAGE 2: DEEP REPO FETCHING
// -------------------------------------------------------

export async function fetchRepoDetails(
  accessToken: string,
  username: string,
  repoName: string,
  repoFullName: string
) {
  const headers = {
    Authorization: `token ${accessToken}`,
    'User-Agent': 'TalentAgent',
    'Accept': 'application/vnd.github.v3+json'
  }

  // Fetch in parallel for speed
  const [readmeRes, commitsRes, languagesRes, contentsRes, pullsRes] =
    await Promise.allSettled([

      // README
      fetch(`https://api.github.com/repos/${repoFullName}/readme`, { headers }),

      // Recent commits
      fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=30&author=${username}`, { headers }),

      // Language breakdown
      fetch(`https://api.github.com/repos/${repoFullName}/languages`, { headers }),

      // Top-level file structure
      fetch(`https://api.github.com/repos/${repoFullName}/contents/`, { headers }),

      // Recent PRs they opened
      fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=10`, { headers })
    ])

  // Parse README
  let readme: string | null = null
  if (readmeRes.status === 'fulfilled' && readmeRes.value.ok) {
    const readmeData = await readmeRes.value.json()
    if (readmeData.content) {
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8').substring(0, 5000)
    }
  }

  // Parse commits
  let commits: any[] = []
  let commitCount = 0
  if (commitsRes.status === 'fulfilled' && commitsRes.value.ok) {
    const commitData = await commitsRes.value.json()
    if (Array.isArray(commitData)) {
      commits = commitData.map((c: any) => ({
        sha: c.sha?.substring(0, 7),
        message: c.commit?.message?.split('\n')[0]?.substring(0, 200),
        date: c.commit?.author?.date,
        additions: c.stats?.additions,
        deletions: c.stats?.deletions
      }))
      commitCount = parseInt(commitsRes.value.headers.get('X-Total-Count') || '0')
    }
  }

  // Parse languages
  let languages: Record<string, number> = {}
  if (languagesRes.status === 'fulfilled' && languagesRes.value.ok) {
    const langData = await languagesRes.value.json()
    const total = Object.values(langData).reduce((a: any, b: any) => a + b, 0) as number
    if (total > 0) {
      languages = Object.fromEntries(
        Object.entries(langData).map(([lang, bytes]) => [
          lang,
          Math.round((bytes as number / total) * 100)
        ])
      )
    }
  }

  // Parse file structure
  let fileStructure: string[] = []
  if (contentsRes.status === 'fulfilled' && contentsRes.value.ok) {
    const contents = await contentsRes.value.json()
    fileStructure = Array.isArray(contents)
      ? contents.map((f: any) => `${f.type === 'dir' ? '[dir]' : '[file]'} ${f.name}`)
      : []
  }

  // Parse PRs
  let pullRequests: any[] = []
  if (pullsRes.status === 'fulfilled' && pullsRes.value.ok) {
    const prData = await pullsRes.value.json()
    pullRequests = Array.isArray(prData) ? prData.map((pr: any) => ({
      title: pr.title?.substring(0, 200),
      state: pr.state,
      body_preview: pr.body?.substring(0, 300)
    })) : []
  }

  return { readme, commits, languages, fileStructure, pullRequests, commitCount }
}

// -------------------------------------------------------
// STAGE 3: PER-REPO CLAUDE ANALYSIS
// -------------------------------------------------------

export async function analyzeRepoWithClaude(repo: any, details: any) {
  const prompt = `You are analyzing a software engineer's GitHub repository to understand what it reveals about their technical capabilities.

Repository: ${repo.full_name}
Description: ${repo.description || 'None provided'}
Primary Language: ${repo.language || 'Unknown'}
Stars: ${repo.stargazers_count}
Is Fork: ${repo.fork}
Last Active: ${repo.pushed_at}
Language Breakdown: ${JSON.stringify(details.languages)}

File Structure (top level):
${details.fileStructure?.join('\n') || 'Not available'}

README (first 3000 chars):
${details.readme?.substring(0, 3000) || 'No README found'}

Recent Commit Messages (last 20):
${details.commits?.slice(0, 20).map((c: any) => `- ${c.message}`).join('\n') || 'No commits found'}

Recent Pull Requests:
${details.pullRequests?.map((pr: any) => `- [${pr.state}] ${pr.title}`).join('\n') || 'None'}

Analyze this repository and return ONLY valid JSON:

{
  "technical_depth_score": <integer 1-10>,
  "technical_depth_evidence": "<specific evidence from the repo that justifies this score>",
  "what_it_does": "<1-2 plain language sentences describing what this project does>",
  "most_impressive_technical_decision": "<the most technically interesting thing visible in this repo, or null if nothing notable>",
  "architecture_patterns": ["<pattern>"],
  "problem_domain": "<single string: web_backend | web_frontend | fullstack | data_engineering | ml_ai | devops_infra | mobile | systems | tooling | other>",
  "code_quality_signals": {
    "documentation": "<poor|fair|good|excellent> - evidence: <string>",
    "testing": "<none|minimal|moderate|strong> - evidence: <string>",
    "organization": "<poor|fair|good|excellent> - evidence: <string>",
    "commit_discipline": "<poor|fair|good|excellent> - evidence: <string>"
  },
  "role_fit_signals": ["<role types this repo demonstrates fitness for>"],
  "honest_concerns": ["<specific concerns: copied code, minimal implementation, abandoned state, etc>"],
  "standout_flag": <boolean - is this one of the most impressive repos you have seen at this level>,
  "standout_reason": "<if standout_flag is true, what specifically makes it stand out>"
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}

// -------------------------------------------------------
// STAGE 4: FINGERPRINT SYNTHESIS
// -------------------------------------------------------

export async function synthesizeFingerprint(githubProfile: any, repoAnalyses: any[]) {
  const allAnalyses = repoAnalyses
    .sort((a, b) => (b.claude_analysis?.technical_depth_score || 0) - (a.claude_analysis?.technical_depth_score || 0))

  const prompt = `You are synthesizing a technical fingerprint for a software engineer based on analysis of their ${repoAnalyses.length} most relevant GitHub repositories.

Engineer GitHub username: ${githubProfile.github_username}
Account created: ${githubProfile.account_created_at}
Public repos total: ${githubProfile.public_repos_count}
Followers: ${githubProfile.followers}

REPOSITORY ANALYSES (ranked by technical depth):
${allAnalyses.map((r, i) => `
Repository ${i + 1}: ${r.repo_name}
- Language breakdown: ${JSON.stringify(r.languages_breakdown)}
- Last active: ${r.last_pushed_at}
- Stars: ${r.stars}
- Is fork: ${r.is_fork}
- Technical depth: ${r.claude_analysis?.technical_depth_score}/10
- What it does: ${r.claude_analysis?.what_it_does}
- Most impressive decision: ${r.claude_analysis?.most_impressive_technical_decision}
- Architecture patterns: ${r.claude_analysis?.architecture_patterns?.join(', ')}
- Problem domain: ${r.claude_analysis?.problem_domain}
- Code quality: ${JSON.stringify(r.claude_analysis?.code_quality_signals)}
- Standout: ${r.claude_analysis?.standout_flag ? 'YES - ' + r.claude_analysis?.standout_reason : 'No'}
- Concerns: ${r.claude_analysis?.honest_concerns?.join(', ') || 'None'}
`).join('\n')}

Synthesize a comprehensive technical fingerprint. Be honest -- do not inflate assessments. If the evidence is thin, say so. If there are genuine strengths, name them specifically.

Return ONLY valid JSON:

{
  "primary_languages": [
    {
      "language": "<string>",
      "proficiency_evidence": "<specific repos and patterns that justify this>",
      "estimated_proficiency": "<beginner|intermediate|advanced|expert>",
      "production_evidence": "<boolean - do we see evidence of production use not just tutorials>",
      "repo_count": <integer>,
      "recency": "<active|recent|older>"
    }
  ],
  "frameworks_detected": [
    {
      "name": "<framework name>",
      "evidence_repos": ["<repo names>"],
      "confidence": "<high|medium|low>",
      "usage_depth": "<surface|moderate|deep>"
    }
  ],
  "architecture_patterns": [
    {
      "pattern": "<string>",
      "evidence": "<specific repos>",
      "description": "<what this tells us about how they build>"
    }
  ],
  "code_quality_signals": {
    "documentation_quality": "<poor|fair|good|excellent>",
    "documentation_evidence": "<string>",
    "test_coverage_signals": "<none|minimal|moderate|strong>",
    "test_evidence": "<string>",
    "commit_message_quality": "<poor|fair|good|excellent>",
    "commit_evidence": "<string>",
    "code_organization": "<poor|fair|good|excellent>",
    "organization_evidence": "<string>",
    "overall_quality_score": <integer 1-10>
  },
  "problem_domains": [
    {
      "domain": "<string>",
      "evidence": "<specific repos>",
      "depth": "<surface|moderate|deep>"
    }
  ],
  "collaboration_signals": {
    "open_source_contributions": "<none|minimal|moderate|significant>",
    "contribution_evidence": "<string>",
    "pr_quality": "<poor|fair|good|excellent|insufficient_data>",
    "pr_evidence": "<string>"
  },
  "skill_trajectory": {
    "direction": "<improving|consistent|mixed|declining|insufficient_data>",
    "evidence": "<what in the commit history and repo recency supports this>",
    "notable_recent_work": "<string - what are they working on right now>"
  },
  "standout_projects": [
    {
      "name": "<repo name>",
      "url": "<repo url>",
      "description": "<what it does and why it stands out>",
      "why_notable": "<specific technical reason this is impressive>",
      "technical_depth_score": <integer 1-10>,
      "most_relevant_for_roles": ["<role types>"]
    }
  ],
  "honest_gaps": [
    "<specific gap with evidence -- things missing from their profile, skills claimed but not demonstrated, etc>"
  ],
  "red_flags": [
    "<anything concerning -- sparse commits, mostly forked repos, copied code, inflated claims>"
  ],
  "summary": "<2-3 sentence plain language summary of this engineer that a recruiter could read in 10 seconds>",
  "seniority_estimate": "<junior|mid|senior|staff|principal>",
  "seniority_evidence": "<what in the profile supports this estimate>",
  "strongest_use_case": "<the type of role and company this engineer is best suited for based purely on GitHub evidence>",
  "overall_github_strength": <integer 1-10>,
  "confidence_in_assessment": "<high|medium|low - based on how much quality data was available>"
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}

// -------------------------------------------------------
// ONBOARDING PROGRESS TRACKER
// -------------------------------------------------------

export async function updateOnboardingProgress(supabase: any, userId: string, updates: any) {
  const { data: current } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('user_id', userId)
    .single()

  const merged = { ...current, ...updates, user_id: userId }

  // Calculate profile strength
  let strength = 0
  if (merged.github_connected) strength += 15
  if (merged.github_ingested) strength += 25
  if (merged.fingerprint_reviewed) strength += 10
  if (merged.basics_complete) strength += 15
  if (merged.preferences_complete) strength += 15
  if (merged.video_uploaded) strength += 10
  if (merged.case_study_complete) strength += 10

  // Calculate agent readiness
  let readiness = 'not_ready'
  if (merged.github_ingested && merged.basics_complete) readiness = 'basic'
  if (strength >= 40) readiness = 'basic'
  if (merged.github_ingested && merged.basics_complete && merged.preferences_complete) readiness = 'good'
  if (strength >= 65) readiness = 'good'
  if (strength >= 80) readiness = 'strong'
  if (strength >= 95) readiness = 'exceptional'

  await supabase.from('onboarding_sessions').upsert({
    ...merged,
    profile_strength: strength,
    agent_readiness: readiness,
    last_active_at: new Date().toISOString()
  }, { onConflict: 'user_id' })
}

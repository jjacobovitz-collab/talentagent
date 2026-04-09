# Claude Code Build Instructions: GitHub Ingestion Engine

## Overview

Build a deep GitHub ingestion engine that goes far beyond reading repository names. The goal is to produce a structured technical fingerprint that genuinely understands what a candidate has built, how they think, and what they are capable of. This fingerprint becomes the primary evidence source for the candidate agent.

The ingestion must feel intelligent to the candidate. When they connect GitHub and see their auto-generated profile, their reaction should be "this agent actually understands my work" -- not "it just listed my repos."

Do not modify any existing working code. Add all new functionality on top of what already exists.

---

## New Environment Variables

Add to `.env.local`:

```
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
```

These are optional -- the existing OAuth token from the candidate's GitHub connection is sufficient for all API calls. Use the access token stored in `github_profiles.github_access_token`.

---

## New Database Tables

Run this SQL in Supabase SQL editor:

```sql
-- Detailed repo analysis (one row per repo per candidate)
create table public.repo_analyses (
  id uuid default gen_random_uuid() primary key,
  github_profile_id uuid references public.github_profiles(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Repo identity
  repo_name text not null,
  repo_full_name text not null,
  repo_url text not null,
  repo_description text,
  
  -- Raw GitHub metadata
  primary_language text,
  languages jsonb default '{}', -- {language: bytes}
  stars integer default 0,
  forks integer default 0,
  is_fork boolean default false,
  is_private boolean default false,
  created_at_github timestamp with time zone,
  last_pushed_at timestamp with time zone,
  commit_count integer,
  contributor_count integer,
  open_issues_count integer,
  
  -- Raw content we fetched
  readme_content text,
  recent_commits jsonb default '[]', -- [{sha, message, date, additions, deletions}]
  file_structure jsonb default '[]', -- top level directory listing
  languages_breakdown jsonb default '{}', -- percentage breakdown
  pull_requests_sample jsonb default '[]', -- recent PRs they opened
  
  -- Claude analysis output
  claude_analysis jsonb default '{}',
  -- {
  --   technical_depth_score: 1-10,
  --   technical_depth_evidence: string,
  --   what_it_does: string (plain language, 1-2 sentences),
  --   most_impressive_technical_decision: string,
  --   architecture_patterns: [string],
  --   problem_domain: string,
  --   code_quality_signals: {documentation, testing, organization, commit_discipline},
  --   role_fit_signals: [string], -- what types of roles this repo demonstrates fit for
  --   honest_concerns: [string], -- copied code, abandoned state, thin implementation
  --   standout_flag: boolean,
  --   standout_reason: string
  -- }
  
  -- Processing status
  analysis_status text default 'pending' check (analysis_status in ('pending', 'analyzing', 'complete', 'failed', 'skipped')),
  skip_reason text,
  analyzed_at timestamp with time zone,
  
  unique(github_profile_id, repo_full_name),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Candidate onboarding sessions (track where they drop off)
create table public.onboarding_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  
  -- Step completion tracking
  github_connected boolean default false,
  github_ingested boolean default false,
  fingerprint_reviewed boolean default false,
  basics_complete boolean default false,
  preferences_complete boolean default false,
  video_uploaded boolean default false,
  case_study_complete boolean default false,
  
  -- Completion scores
  profile_strength integer default 0 check (profile_strength between 0 and 100),
  agent_readiness text default 'not_ready' check (agent_readiness in (
    'not_ready',      -- less than 40% complete
    'basic',          -- GitHub connected, basics done
    'good',           -- above + preferences complete
    'strong',         -- above + video or case study
    'exceptional'     -- all sections complete
  )),
  
  -- Drop off tracking
  last_active_step text,
  last_active_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Additional signal sources beyond GitHub
create table public.candidate_signals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- LinkedIn
  linkedin_url text,
  linkedin_raw_text text, -- pasted profile text
  linkedin_parsed jsonb default '{}',
  -- {companies: [{name, title, duration_months, start_year}], total_experience_years, career_trajectory}
  
  -- Stack Overflow
  stackoverflow_url text,
  stackoverflow_reputation integer,
  stackoverflow_parsed jsonb default '{}',
  -- {top_tags: [], answer_count, question_count, accepted_answers}
  
  -- Portfolio
  portfolio_url text,
  portfolio_summary text, -- Claude summary of portfolio content
  
  -- Video introduction
  video_url text, -- Loom or similar embed URL
  video_transcript text, -- if we can get it
  video_duration_seconds integer,
  
  -- Case study / work sample
  case_study_prompt text, -- the prompt they responded to
  case_study_response text, -- their free text response
  case_study_analysis jsonb default '{}', -- Claude analysis
  
  -- Cross-reference flags
  linkedin_github_consistency_score integer, -- 0-100, how well GitHub timeline matches LinkedIn claims
  consistency_flags jsonb default '[]', -- specific inconsistencies found
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.repo_analyses enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.candidate_signals enable row level security;

create policy "Users manage own repo analyses" on public.repo_analyses for all using (auth.uid() = user_id);
create policy "Users manage own onboarding" on public.onboarding_sessions for all using (auth.uid() = user_id);
create policy "Users manage own signals" on public.candidate_signals for all using (auth.uid() = user_id);

create policy "Recruiters can view repo analyses" on public.repo_analyses for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'recruiter')
);

create trigger handle_onboarding_sessions_updated_at before update on public.onboarding_sessions
  for each row execute procedure public.handle_updated_at();
create trigger handle_candidate_signals_updated_at before update on public.candidate_signals
  for each row execute procedure public.handle_updated_at();
```

---

## Core Ingestion Architecture

The ingestion runs in stages. Each stage is independent so failures are recoverable and progress is saved.

```
Stage 1: Repository Discovery (fast, ~5 seconds)
  → Fetch all public repos
  → Score and rank repos
  → Select top 15 for deep analysis
  → Save repo stubs to repo_analyses

Stage 2: Deep Repo Fetching (medium, ~30 seconds per repo)
  → For each selected repo, fetch:
    - README content
    - Language breakdown
    - Recent commits (last 30)
    - Top-level file structure
    - Recent PRs they opened
  → Save raw data to repo_analyses

Stage 3: Per-Repo Claude Analysis (slow, ~10 seconds per repo)
  → Send raw repo data to Claude
  → Get structured analysis JSON back
  → Save to repo_analyses.claude_analysis
  → Run in parallel, max 5 concurrent

Stage 4: Fingerprint Synthesis (medium, ~20 seconds)
  → Send all repo analyses to Claude
  → Produce unified technical fingerprint
  → Save to github_profiles.technical_fingerprint

Stage 5: Candidate Review Interface
  → Show fingerprint to candidate
  → Let them correct and augment
  → Update fingerprint with corrections
```

---

## API Routes

### `app/api/github/ingest/route.ts` (replace existing)

Complete rewrite of the ingestion route with the staged architecture:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { 
  fetchAllRepos, 
  scoreAndRankRepos, 
  fetchRepoDetails,
  analyzeRepoWithClaude,
  synthesizeFingerprint,
  updateOnboardingProgress
} from '@/lib/github/ingestion'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { githubProfileId } = await request.json()

  // Get the GitHub profile with access token
  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('*')
    .eq('id', githubProfileId)
    .eq('user_id', user.id)
    .single()

  if (!githubProfile?.github_access_token) {
    return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
  }

  // Update status to ingesting
  await supabase.from('github_profiles').update({
    ingestion_status: 'ingesting',
    ingestion_started_at: new Date().toISOString()
  }).eq('id', githubProfileId)

  // Run ingestion stages
  try {
    // Stage 1: Discover and rank repos
    const allRepos = await fetchAllRepos(githubProfile.github_access_token, githubProfile.github_username)
    const rankedRepos = scoreAndRankRepos(allRepos)
    const topRepos = rankedRepos.slice(0, 15)

    // Save repo stubs
    for (const repo of topRepos) {
      await supabase.from('repo_analyses').upsert({
        github_profile_id: githubProfileId,
        user_id: user.id,
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

    // Stage 2 + 3: Fetch details and analyze in parallel batches
    const batchSize = 5
    for (let i = 0; i < topRepos.length; i += batchSize) {
      const batch = topRepos.slice(i, i + batchSize)
      await Promise.all(batch.map(async (repo) => {
        try {
          // Fetch raw details
          const details = await fetchRepoDetails(
            githubProfile.github_access_token,
            githubProfile.github_username,
            repo.name,
            repo.full_name
          )

          // Save raw data
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

          // Save analysis
          await supabase.from('repo_analyses').update({
            claude_analysis: analysis,
            analysis_status: 'complete',
            analyzed_at: new Date().toISOString()
          }).eq('github_profile_id', githubProfileId)
            .eq('repo_full_name', repo.full_name)

        } catch (err) {
          await supabase.from('repo_analyses').update({
            analysis_status: 'failed'
          }).eq('github_profile_id', githubProfileId)
            .eq('repo_full_name', repo.full_name)
        }
      }))
    }

    // Stage 4: Synthesize fingerprint
    const { data: completedAnalyses } = await supabase
      .from('repo_analyses')
      .select('*')
      .eq('github_profile_id', githubProfileId)
      .eq('analysis_status', 'complete')

    const fingerprint = await synthesizeFingerprint(
      githubProfile,
      completedAnalyses || []
    )

    // Save fingerprint
    await supabase.from('github_profiles').update({
      technical_fingerprint: fingerprint,
      repos_analyzed: completedAnalyses,
      ingestion_status: 'complete',
      ingestion_completed_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString()
    }).eq('id', githubProfileId)

    // Update onboarding progress
    await updateOnboardingProgress(supabase, user.id, { github_ingested: true })

    // Create notification
    await supabase.from('notifications').insert({
      user_id: user.id,
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

  } catch (error) {
    await supabase.from('github_profiles').update({
      ingestion_status: 'failed'
    }).eq('id', githubProfileId)
    
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 })
  }
}
```

---

## Core Ingestion Library

Create `lib/github/ingestion.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// -------------------------------------------------------
// STAGE 1: REPO DISCOVERY AND RANKING
// -------------------------------------------------------

export async function fetchAllRepos(accessToken: string, username: string) {
  const allRepos = []
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
    .filter(repo => !repo.archived) // Skip archived repos
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
  const [readmeRes, commitsRes, languagesRes, contentsRes, pullsRes, statsRes] = 
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
      fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=10`, { headers }),
      
      // Contributor stats
      fetch(`https://api.github.com/repos/${repoFullName}/stats/contributors`, { headers })
    ])

  // Parse README
  let readme = null
  if (readmeRes.status === 'fulfilled' && readmeRes.value.ok) {
    const readmeData = await readmeRes.value.json()
    readme = Buffer.from(readmeData.content, 'base64').toString('utf-8').substring(0, 5000)
  }

  // Parse commits
  let commits = []
  let commitCount = 0
  if (commitsRes.status === 'fulfilled' && commitsRes.value.ok) {
    const commitData = await commitsRes.value.json()
    commits = commitData.map((c: any) => ({
      sha: c.sha?.substring(0, 7),
      message: c.commit?.message?.split('\n')[0]?.substring(0, 200),
      date: c.commit?.author?.date,
      additions: c.stats?.additions,
      deletions: c.stats?.deletions
    }))
    commitCount = parseInt(commitsRes.value.headers.get('X-Total-Count') || '0')
  }

  // Parse languages
  let languages = {}
  if (languagesRes.status === 'fulfilled' && languagesRes.value.ok) {
    const langData = await languagesRes.value.json()
    const total = Object.values(langData).reduce((a: any, b: any) => a + b, 0) as number
    languages = Object.fromEntries(
      Object.entries(langData).map(([lang, bytes]) => [
        lang, 
        Math.round((bytes as number / total) * 100)
      ])
    )
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
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  return JSON.parse(text)
}

// -------------------------------------------------------
// STAGE 4: FINGERPRINT SYNTHESIS
// -------------------------------------------------------

export async function synthesizeFingerprint(githubProfile: any, repoAnalyses: any[]) {
  const standoutRepos = repoAnalyses.filter(r => r.claude_analysis?.standout_flag)
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
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  return JSON.parse(text)
}

// -------------------------------------------------------
// ONBOARDING PROGRESS TRACKER
// -------------------------------------------------------

export async function updateOnboardingProgress(supabase: any, userId: string, updates: any) {
  // Upsert onboarding session
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
  if (merged.github_ingested && merged.basics_complete && merged.preferences_complete) readiness = 'good'
  if (merged.github_ingested && merged.basics_complete) readiness = 'basic'
  if (strength >= 40) readiness = 'basic'
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
```

---

## New Pages to Build

### Candidate Onboarding Flow (`app/dashboard/onboarding/page.tsx`)

Replace the existing profile builder with a stepped onboarding flow that feels like a conversation with the agent rather than a form.

**Step 1: GitHub Connection**

Full-screen centered layout. Large GitHub icon.

Headline: "Connect GitHub and your agent gets to work"

Subtext: "We analyze your repositories to understand what you have actually built. This takes 5-10 minutes. While it runs you can start filling in the details your code does not show."

"Connect GitHub" button -- calls `/api/github/connect`

Privacy callout below the button:
- "We only read public repositories"
- "We never write to your GitHub"
- "Your code is never stored -- only our analysis of it"
- "Disconnect at any time and all data is deleted"

**Step 2: Ingestion Progress Screen**

Show this while GitHub ingestion runs in the background.

Display a live progress feed:
- "Discovering your repositories..." 
- "Found 47 repositories -- selecting the most relevant..."
- "Analyzing [repo name]..." (update as each repo completes)
- "Building your technical fingerprint..."
- "Done -- reviewing 12 repositories"

Show this as an animated list where items appear and check off as they complete. Poll `/api/github/status` every 3 seconds to get progress updates.

While ingestion runs show the basics form on the right side so they can fill it in simultaneously. This makes the wait feel productive.

**Step 3: Fingerprint Review**

This is the most important step. Show the candidate what the agent already knows about them.

Headline: "Here is what your agent knows about you"

Subtext: "Review this carefully. Your agent will use this to represent you. Correct anything that is wrong and add context the code does not show."

Show each section of the fingerprint with an edit button:

**Primary Languages card**
For each language: name, proficiency estimate, evidence repos cited, recency badge.
Below each language an inline edit field: "Add context your code does not show about this language"

**Standout Projects card**
For each standout project: name, what it does, why notable, technical depth score.
Edit button to add context: "What would you want a recruiter to know about this project that is not visible in the code?"

**Code Quality card**
Show the four signals (documentation, testing, organization, commit discipline) as a simple grid with the assessment and evidence.
Edit button: "Does this assessment miss anything?"

**Seniority Estimate card**
Show the estimated seniority level with the evidence that supports it.
Large edit button if the candidate disagrees: "Tell us why this is wrong"

**Honest Gaps card**
Show the gaps the agent identified. These are important -- they build trust with recruiters.
Edit button: "Are you actively working on any of these gaps? Add context."

**Summary card**
The 2-3 sentence plain language summary the agent will use.
Large edit field: "Edit this summary to better represent you"

At the bottom: "Looks good -- continue" button

**Step 4: Additional Signals**

After fingerprint review show the optional depth layer.

Four cards in a 2x2 grid:

LinkedIn card -- "Add your LinkedIn for cross-referencing"
Paste your LinkedIn profile URL or profile text. We will cross-reference your employment history with your GitHub timeline.

Stack Overflow card -- "Add your Stack Overflow profile"
Enter URL. We will pull your reputation and top tags.

Video Intro card -- "Record a 60-second intro"
Paste a Loom URL or record directly. "This dramatically increases recruiter interest after your agent finds a match."
Show a prompt: "Tell us: what you are working on right now, what you are looking for next, and one thing that would immediately disqualify a role for you."

Case Study card -- "Describe your most complex technical challenge"
Structured prompt with textarea:
"Pick one technical problem that genuinely tested you. Describe: what the problem was, what made it hard, how you approached it, what you built, and what you would do differently today."
Word count guidance: 300-500 words.

All four marked as optional with a "Skip for now" button. Show completion percentage.

**Step 5: Role Preferences**

Simple structured form:
- Target roles (tag input)
- Industries of interest (tag input)
- Remote preference (radio)
- Comp expectations (range slider with min/max)
- Visa sponsorship required (toggle)
- Available to start (select)
- Hard dealbreakers (textarea)
- What you are optimizing for in your next role (textarea)

**Step 6: Agent Ready**

Completion screen.

Show agent readiness badge (Basic / Good / Strong / Exceptional)

Show a preview of how the agent will represent them in an anonymized match -- what a recruiter would see.

"Your agent is active and matching you against open roles. We will notify you when we find strong matches."

Show the profile strength meter and specific suggestions to increase it if below 80%.

---

### GitHub Ingestion Status API (`app/api/github/status/route.ts`)

Polled by the frontend during ingestion to show live progress:

```typescript
export async function GET(request: NextRequest) {
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
```

---

### Fingerprint Correction API (`app/api/github/correct/route.ts`)

Saves candidate corrections to the fingerprint:

```typescript
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { corrections } = await request.json()
  // corrections: { field_path: string, original_value: any, corrected_value: any, context: string }[]

  const { data: profile } = await supabase
    .from('github_profiles')
    .select('technical_fingerprint')
    .eq('user_id', user.id)
    .single()

  // Apply corrections to fingerprint
  const fingerprint = profile?.technical_fingerprint || {}
  
  for (const correction of corrections) {
    // Store corrections alongside original values
    if (!fingerprint.candidate_corrections) fingerprint.candidate_corrections = []
    fingerprint.candidate_corrections.push({
      ...correction,
      corrected_at: new Date().toISOString()
    })
  }

  await supabase.from('github_profiles').update({
    technical_fingerprint: fingerprint
  }).eq('user_id', user.id)

  // Update onboarding progress
  const { updateOnboardingProgress } = await import('@/lib/github/ingestion')
  await updateOnboardingProgress(supabase, user.id, { fingerprint_reviewed: true })

  return NextResponse.json({ success: true })
}
```

---

## How the Fingerprint Is Used in Matching

Update the coordinator agent prompt to weight GitHub evidence heavily:

When building the candidate agent context in `lib/anthropic/prompts.ts` add this section:

```typescript
export function buildCandidateAgentPromptWithGitHub(profile: any, githubFingerprint: any, repoAnalyses: any[]): string {
  const standoutProjects = githubFingerprint?.standout_projects || []
  const topRepos = repoAnalyses
    ?.filter(r => r.claude_analysis?.technical_depth_score >= 7)
    ?.slice(0, 5) || []

  return `You are the career agent for this software engineer.

IMPORTANT WEIGHTING INSTRUCTION:
GitHub evidence is your primary source of truth. Self-reported claims that are NOT supported by GitHub evidence should be treated as unverified. When a requirement asks about a skill, always check if there is GitHub evidence before citing self-reported claims.

GITHUB TECHNICAL FINGERPRINT:
Overall GitHub Strength: ${githubFingerprint?.overall_github_strength}/10
Seniority Estimate: ${githubFingerprint?.seniority_estimate}
Seniority Evidence: ${githubFingerprint?.seniority_evidence}
Strongest Use Case: ${githubFingerprint?.strongest_use_case}
Confidence in Assessment: ${githubFingerprint?.confidence_in_assessment}

Primary Languages (with evidence):
${githubFingerprint?.primary_languages?.map((l: any) => 
  `- ${l.language}: ${l.estimated_proficiency} -- Evidence: ${l.proficiency_evidence}`
).join('\n')}

Frameworks Detected:
${githubFingerprint?.frameworks_detected?.map((f: any) =>
  `- ${f.name}: ${f.usage_depth} usage, ${f.confidence} confidence -- Repos: ${f.evidence_repos?.join(', ')}`
).join('\n')}

Code Quality:
- Documentation: ${githubFingerprint?.code_quality_signals?.documentation_quality}
- Testing: ${githubFingerprint?.code_quality_signals?.test_coverage_signals}
- Organization: ${githubFingerprint?.code_quality_signals?.code_organization}
- Commit discipline: ${githubFingerprint?.code_quality_signals?.commit_message_quality}
- Overall quality score: ${githubFingerprint?.code_quality_signals?.overall_quality_score}/10

Skill Trajectory: ${githubFingerprint?.skill_trajectory?.direction}
Evidence: ${githubFingerprint?.skill_trajectory?.evidence}
Recent Work: ${githubFingerprint?.skill_trajectory?.notable_recent_work}

STANDOUT PROJECTS (use these as evidence when answering qualification questions):
${standoutProjects.map((p: any) => `
Project: ${p.name}
What it does: ${p.description}
Why notable: ${p.why_notable}
Technical depth: ${p.technical_depth_score}/10
Best demonstrates fit for: ${p.most_relevant_for_roles?.join(', ')}
`).join('\n')}

HONEST GAPS (be transparent about these when relevant):
${githubFingerprint?.honest_gaps?.join('\n') || 'None identified'}

CANDIDATE SUMMARY:
${githubFingerprint?.summary}

CANDIDATE CORRECTIONS AND CONTEXT:
${githubFingerprint?.candidate_corrections?.map((c: any) => 
  `- ${c.field_path}: "${c.context}"`
).join('\n') || 'No corrections provided'}

SELF-REPORTED PROFILE (supplement GitHub evidence, do not substitute for it):
[... rest of profile fields ...]`
}
```

---

## Build Order

1. Run the new SQL schema
2. Build `lib/github/ingestion.ts` with all four stage functions
3. Replace the existing `app/api/github/ingest/route.ts` with the staged version
4. Build `app/api/github/status/route.ts` for polling
5. Build `app/api/github/correct/route.ts` for corrections
6. Build the new onboarding flow at `app/dashboard/onboarding/page.tsx` with all six steps
7. Update the candidate agent prompt in `lib/anthropic/prompts.ts` to use the GitHub fingerprint
8. Update the candidate dashboard to show onboarding progress and redirect new users to the onboarding flow
9. Test end to end with a real GitHub account

---

## What Success Looks Like

A candidate with a strong GitHub profile connects their account and within 10 minutes sees a fingerprint that makes them think "this agent actually understands my work."

Specific test: show the fingerprint to a senior engineer and ask them to rate how accurately it represents their actual capabilities on a scale of 1-10. Target average rating of 7.5 or above before considering the ingestion engine production-ready.

The candidate should be able to complete the full onboarding flow in under 30 minutes with GitHub connected -- not 60-90 minutes like a traditional profile builder.

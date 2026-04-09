# Claude Code Build Instructions: JD Parser + Smart Follow-Up Questions

## Overview

Eliminate recruiter friction in buyer agent creation by building a JD-to-agent parser. Instead of filling out a long form, the recruiter pastes a job description and Claude automatically extracts everything the buyer agent needs. Then it asks three targeted follow-up questions based on what the JD did not say.

The entire buyer agent creation flow should take under two minutes.

Also build:
- A browser bookmarklet that pre-populates the JD field from any job posting page
- Agent templates based on a recruiter's previous buyer agents
- One-click ATS push to Greenhouse and Lever when a mutual confirmation happens

Do not modify any existing working code. Add all new functionality on top of what already exists.

---

## New Database Tables

Run this SQL in Supabase SQL editor:

```sql
-- Agent templates (auto-generated from recruiter's pattern of buyer agents)
create table public.agent_templates (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  company_profile_id uuid references public.company_profiles(id),
  
  -- Template metadata
  template_name text not null,
  role_category text, -- 'backend', 'frontend', 'fullstack', 'devops', 'data', 'ml', 'mobile'
  seniority_level text, -- 'mid', 'senior', 'staff', 'principal'
  
  -- Pre-filled fields derived from patterns
  common_required_skills text[],
  common_preferred_skills text[],
  typical_comp_band_min integer,
  typical_comp_band_max integer,
  typical_remote_policy text,
  
  -- Context fields that are always the same
  standard_why_candidates_fail text,
  standard_hiring_manager_priorities text,
  standard_team_dynamics text,
  
  -- Usage tracking
  times_used integer default 0,
  last_used_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- JD parse history (track what we extracted and how accurate it was)
create table public.jd_parses (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  buyer_agent_id uuid references public.buyer_agents(id),
  
  -- Raw input
  raw_jd_text text not null,
  source_url text, -- if bookmarklet was used
  
  -- Parsed output
  parsed_data jsonb not null default '{}',
  -- Full structured extraction from Claude
  
  -- Follow-up questions generated
  follow_up_questions jsonb default '[]',
  -- Array of {question, field, why_we_are_asking, recruiter_answer}
  
  -- Accuracy feedback (recruiter can flag incorrect extractions)
  accuracy_rating integer check (accuracy_rating between 1 and 5),
  accuracy_notes text,
  
  -- ATS integration
  ats_type text, -- 'greenhouse', 'lever', 'ashby', 'workday', 'other'
  ats_job_id text,
  ats_push_status text check (ats_push_status in ('pending', 'pushed', 'failed', 'not_applicable')),
  ats_pushed_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ATS connections per recruiter
create table public.ats_connections (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  
  ats_type text not null check (ats_type in ('greenhouse', 'lever', 'ashby', 'merge')),
  
  -- Credentials (encrypted at rest by Supabase)
  api_key text, -- for Greenhouse and Lever
  board_token text, -- for Greenhouse job board
  subdomain text, -- for Lever (company.lever.co)
  merge_account_token text, -- for Merge.dev unified API
  
  -- Connection status
  is_active boolean default true,
  last_verified_at timestamp with time zone,
  verification_status text check (verification_status in ('verified', 'failed', 'pending')),
  
  -- Permissions
  can_read_jobs boolean default true,
  can_write_candidates boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(recruiter_id, ats_type)
);

-- RLS
alter table public.agent_templates enable row level security;
alter table public.jd_parses enable row level security;
alter table public.ats_connections enable row level security;

create policy "Recruiters manage own templates" on public.agent_templates 
  for all using (auth.uid() = recruiter_id);

create policy "Recruiters manage own jd parses" on public.jd_parses 
  for all using (auth.uid() = recruiter_id);

create policy "Recruiters manage own ats connections" on public.ats_connections 
  for all using (auth.uid() = recruiter_id);

create trigger handle_agent_templates_updated_at before update on public.agent_templates
  for each row execute procedure public.handle_updated_at();

create trigger handle_ats_connections_updated_at before update on public.ats_connections
  for each row execute procedure public.handle_updated_at();
```

---

## New API Routes

### `app/api/jd/parse/route.ts`

The core JD parsing endpoint. Takes raw JD text and returns structured data plus targeted follow-up questions.

```typescript
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { jdText, sourceUrl, companyProfileId } = await request.json()

  if (!jdText || jdText.length < 100) {
    return NextResponse.json({ error: 'Job description too short' }, { status: 400 })
  }

  // Get company profile context if available
  let companyContext = ''
  if (companyProfileId) {
    const { data: company } = await supabase
      .from('company_profiles')
      .select('company_name, core_languages, core_frameworks, engineering_culture, remote_policy, base_comp_philosophy')
      .eq('id', companyProfileId)
      .single()
    
    if (company) {
      companyContext = `
Company context (use this to fill gaps in the JD):
- Company: ${company.company_name}
- Known tech stack: ${company.core_languages?.join(', ')} / ${company.core_frameworks?.join(', ')}
- Engineering culture: ${company.engineering_culture}
- Remote policy: ${company.remote_policy}
- Comp philosophy: ${company.base_comp_philosophy}
`
    }
  }

  // Stage 1: Parse the JD
  const parseResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Parse this job description and extract structured data for a recruiting agent. Be precise. If something is not clearly stated in the JD mark it as null rather than guessing.

${companyContext}

JOB DESCRIPTION:
${jdText.substring(0, 6000)}

Return ONLY valid JSON:
{
  "role_title": "string",
  "seniority_level": "junior|mid|senior|staff|principal|director|null",
  "role_category": "backend|frontend|fullstack|devops|data|ml|mobile|other",
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "tech_stack": ["string"],
  "years_experience_min": integer or null,
  "years_experience_max": integer or null,
  "comp_min": integer or null,
  "comp_max": integer or null,
  "remote_type": "remote|hybrid|onsite|flexible|null",
  "visa_sponsorship": true|false|null,
  "key_responsibilities": ["string"],
  "team_context": "string or null",
  "company_name": "string or null",
  "location": "string or null",
  "what_jd_emphasizes": "string -- what does this JD seem to care about most",
  "what_jd_omits": ["string -- important things a good JD should mention but this one does not"],
  "red_flags_in_jd": ["string -- anything in the JD that is a concern: unrealistic requirements, laundry list, etc"]
}`
    }]
  })

  const parseText = parseResult.content[0].type === 'text' ? parseResult.content[0].text : '{}'
  let parsed: any = {}
  try {
    parsed = JSON.parse(parseText)
  } catch {
    return NextResponse.json({ error: 'Failed to parse JD' }, { status: 500 })
  }

  // Stage 2: Generate targeted follow-up questions
  const questionsResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You just parsed this job description for a recruiting agent. Based on what the JD says and what it omits, generate exactly 3 targeted follow-up questions to ask the recruiter.

These questions should surface the hidden context that makes a buyer agent dramatically smarter:
- Why have past candidates failed at this stage
- What the hiring manager actually cares about that is not in the JD
- Specific dealbreakers or requirements that are implied but not stated
- Scale, team dynamics, or technical depth that the JD skips over

Make each question specific to THIS job description. Do not ask generic questions. Reference specific things from the JD.

Parsed JD data:
${JSON.stringify(parsed, null, 2)}

Return ONLY valid JSON array of exactly 3 questions:
[
  {
    "question": "specific targeted question text",
    "field": "why_last_candidates_failed|what_hiring_manager_actually_cares_about|hidden_dealbreakers|actual_remote_flexibility|team_dynamics|technical_depth|other",
    "why_we_are_asking": "one sentence explanation of why this question matters for matching",
    "placeholder": "example answer to help the recruiter understand what we want"
  }
]`
    }]
  })

  const questionsText = questionsResult.content[0].type === 'text' ? questionsResult.content[0].text : '[]'
  let questions: any[] = []
  try {
    questions = JSON.parse(questionsText)
  } catch {
    questions = []
  }

  // Save parse record
  const { data: parseRecord } = await supabase
    .from('jd_parses')
    .insert({
      recruiter_id: user.id,
      raw_jd_text: jdText,
      source_url: sourceUrl,
      parsed_data: parsed,
      follow_up_questions: questions
    })
    .select()
    .single()

  // Check if recruiter has agent templates to suggest
  const { data: templates } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('recruiter_id', user.id)
    .eq('role_category', parsed.role_category)
    .eq('seniority_level', parsed.seniority_level)
    .limit(1)

  return NextResponse.json({
    parseId: parseRecord?.id,
    parsed,
    questions,
    suggestedTemplate: templates?.[0] || null
  })
}
```

### `app/api/jd/create-agent/route.ts`

Takes parsed JD data plus recruiter's answers to follow-up questions and creates the buyer agent:

```typescript
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 
    parseId,
    parsed, 
    questionAnswers, // [{field, answer}]
    companyProfileId,
    rawJdText
  } = await request.json()

  // Map question answers to buyer agent fields
  const fieldMapping: any = {}
  for (const answer of questionAnswers) {
    if (answer.answer && answer.answer.trim()) {
      fieldMapping[answer.field] = answer.answer
    }
  }

  // Create the buyer agent
  const { data: buyerAgent } = await supabase
    .from('buyer_agents')
    .insert({
      recruiter_id: user.id,
      company_profile_id: companyProfileId,
      role_title: parsed.role_title,
      company_name: parsed.company_name || 'Not specified',
      job_description: rawJdText,
      required_skills: parsed.required_skills,
      preferred_skills: parsed.preferred_skills,
      years_experience_min: parsed.years_experience_min,
      years_experience_max: parsed.years_experience_max,
      comp_band_min: parsed.comp_min,
      comp_band_max: parsed.comp_max,
      why_last_candidates_failed: fieldMapping.why_last_candidates_failed,
      what_hiring_manager_actually_cares_about: fieldMapping.what_hiring_manager_actually_cares_about,
      hidden_dealbreakers: fieldMapping.hidden_dealbreakers,
      actual_remote_flexibility: fieldMapping.actual_remote_flexibility,
      team_dynamics: fieldMapping.team_dynamics,
      status: 'active'
    })
    .select()
    .single()

  // Update the parse record with the buyer agent ID
  if (parseId) {
    await supabase.from('jd_parses')
      .update({ buyer_agent_id: buyerAgent?.id })
      .eq('id', parseId)
  }

  // Update or create agent template for this recruiter
  await updateAgentTemplate(supabase, user.id, companyProfileId, parsed, fieldMapping)

  // Trigger matching against candidate pool
  // Fire and forget -- do not await
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/match/run-for-agent`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    },
    body: JSON.stringify({ buyerAgentId: buyerAgent?.id })
  })

  return NextResponse.json({ buyerAgent })
}

async function updateAgentTemplate(
  supabase: any, 
  recruiterId: string, 
  companyProfileId: string,
  parsed: any,
  fieldMapping: any
) {
  // Check if template exists for this role category + seniority
  const { data: existing } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .eq('role_category', parsed.role_category)
    .eq('seniority_level', parsed.seniority_level)
    .single()

  if (existing) {
    // Update with new data -- merge skills
    const mergedSkills = [...new Set([
      ...(existing.common_required_skills || []),
      ...(parsed.required_skills || [])
    ])]

    await supabase.from('agent_templates').update({
      common_required_skills: mergedSkills,
      times_used: (existing.times_used || 0) + 1,
      last_used_at: new Date().toISOString()
    }).eq('id', existing.id)
  } else {
    // Create new template
    await supabase.from('agent_templates').insert({
      recruiter_id: recruiterId,
      company_profile_id: companyProfileId,
      template_name: `${parsed.seniority_level} ${parsed.role_category} engineer`,
      role_category: parsed.role_category,
      seniority_level: parsed.seniority_level,
      common_required_skills: parsed.required_skills,
      common_preferred_skills: parsed.preferred_skills,
      standard_why_candidates_fail: fieldMapping.why_last_candidates_failed,
      standard_hiring_manager_priorities: fieldMapping.what_hiring_manager_actually_cares_about,
      times_used: 1,
      last_used_at: new Date().toISOString()
    })
  }
}
```

### `app/api/ats/push-candidate/route.ts`

Pushes a revealed candidate to Greenhouse or Lever:

```typescript
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, atsType } = await request.json()

  // Get match with candidate and job details
  const { data: match } = await supabase
    .from('autonomous_matches')
    .select(`
      *,
      candidate_profiles(*, profiles(full_name, email)),
      github_profiles(technical_fingerprint),
      job_postings(source_job_id, company_name, title)
    `)
    .eq('id', matchId)
    .single()

  if (!match || match.match_status !== 'revealed') {
    return NextResponse.json({ error: 'Match not revealed' }, { status: 400 })
  }

  // Get ATS connection
  const { data: atsConnection } = await supabase
    .from('ats_connections')
    .select('*')
    .eq('recruiter_id', user.id)
    .eq('ats_type', atsType)
    .eq('is_active', true)
    .single()

  if (!atsConnection) {
    return NextResponse.json({ error: 'ATS not connected' }, { status: 400 })
  }

  const candidate = match.candidate_profiles
  const fingerprint = match.github_profiles?.technical_fingerprint

  try {
    let result

    if (atsType === 'greenhouse') {
      result = await pushToGreenhouse(atsConnection, match, candidate, fingerprint)
    } else if (atsType === 'lever') {
      result = await pushToLever(atsConnection, match, candidate, fingerprint)
    }

    // Update match with ATS push status
    await supabase.from('jd_parses').update({
      ats_push_status: 'pushed',
      ats_pushed_at: new Date().toISOString()
    }).eq('buyer_agent_id', match.buyer_agent_id)

    return NextResponse.json({ success: true, result })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function pushToGreenhouse(connection: any, match: any, candidate: any, fingerprint: any) {
  const candidateName = candidate.profiles.full_name.split(' ')
  
  // Build a rich note that summarizes the TalentAgent match
  const note = `
Sourced via TalentAgent bilateral matching platform.

Match Score: ${match.overall_fit_score}/100
Technical Fit: ${match.technical_fit_score}/100
Role Fit: ${match.role_fit_score}/100
Recommendation: ${match.recommendation}

Agent Summary: ${match.recommendation_summary}

GitHub Verification: ${fingerprint?.summary || 'Not available'}
GitHub Strength: ${fingerprint?.overall_github_strength}/10
Seniority Estimate: ${fingerprint?.seniority_estimate}

Both candidate and hiring team confirmed mutual interest before introduction.
  `.trim()

  const response = await fetch(
    `https://harvest.greenhouse.io/v1/candidates`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(connection.api_key + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'On-Behalf-Of': connection.greenhouse_user_id || ''
      },
      body: JSON.stringify({
        first_name: candidateName[0],
        last_name: candidateName.slice(1).join(' ') || 'Unknown',
        email_addresses: [{
          value: candidate.profiles.email,
          type: 'personal'
        }],
        tags: ['TalentAgent', `Score: ${match.overall_fit_score}`],
        notes: note
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Greenhouse API error: ${response.status}`)
  }

  return await response.json()
}

async function pushToLever(connection: any, match: any, candidate: any, fingerprint: any) {
  const note = `Sourced via TalentAgent. Match score: ${match.overall_fit_score}/100. ${match.recommendation_summary}`

  const response = await fetch(
    `https://api.lever.co/v1/opportunities`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(connection.api_key + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        perform_as: connection.lever_user_id,
        posting: connection.lever_posting_id,
        contact: {
          name: candidate.profiles.full_name,
          email: candidate.profiles.email,
          headline: `TalentAgent Match - Score: ${match.overall_fit_score}/100`
        },
        createdAt: Date.now(),
        tags: ['TalentAgent'],
        sources: ['TalentAgent'],
        notes: [{ value: note }]
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Lever API error: ${response.status}`)
  }

  return await response.json()
}
```

---

## New Pages to Build

### Redesigned Buyer Agent Creation (`app/dashboard/agents/new/page.tsx`)

Replace the existing form with the JD-first flow. Three steps:

**Step 1: Paste JD**

Full width layout. Large textarea with placeholder:
"Paste the job description here. Copy it from Greenhouse, Lever, your ATS, a Word doc, anywhere. We will extract everything automatically."

Below the textarea:
- "Or import from URL" -- text field where they can paste a job posting URL and we fetch the content
- Company profile selector dropdown: "Link to company profile (recommended)" -- pulls in company context

"Parse this JD →" button. Should feel instant and exciting.

While parsing show an animated progress:
- "Reading job requirements..."
- "Extracting tech stack..."
- "Identifying gaps in the JD..."
- "Generating follow-up questions..."

**Step 2: Review and Answer**

Two column layout.

Left column -- parsed fields displayed as an editable preview:
- Role title (editable)
- Seniority level (editable select)
- Required skills (editable tags)
- Preferred skills (editable tags)
- Tech stack (editable tags)
- Experience range (editable)
- Comp range (editable)
- Remote type (editable select)

Each field has a small "Edit" pencil icon. Most recruiters will not need to edit -- they just confirm. This is much faster than filling out the form from scratch.

Right column -- the three follow-up questions:

Each question displayed as a card with:
- The question text in bold
- A small italic explanation: why we are asking
- A textarea for the answer with the placeholder example
- Required badge on questions marked required

Below the questions:
- "Create buyer agent →" button

If the recruiter has a matching template show a banner at the top:
"You have created senior backend agents before. We pre-filled some fields from your previous roles. Check the answers below."

**Step 3: Agent Created**

Show the buyer agent summary card.
Show how many candidates in the pool are being assessed right now.
Show an estimated time to first matches: "Your agent is matching against X candidates. First results expected in Y minutes."

Show a "Add another role" button and a "View match queue" button.

---

### ATS Integration Page (`app/dashboard/integrations/page.tsx`)

Add to recruiter sidebar below "Companies."

Show three ATS integration cards:

**Greenhouse card**
- Logo and name
- "Connect" button
- On connect: modal asking for Harvest API Key and optionally their Greenhouse board token
- After connecting: show status as Connected with a green dot
- Show: "Candidates revealed through TalentAgent will be automatically added to Greenhouse"

**Lever card**
- Logo and name
- "Connect" button
- On connect: modal asking for Lever API key and company subdomain
- Same behavior as Greenhouse

**Other ATS card**
- Generic card
- "Request integration" button
- Shows a simple form: "Which ATS do you use?" with a text field and submit
- Collected responses tell you what to build next

---

### Bookmarklet Generator (`app/dashboard/integrations/bookmarklet/page.tsx`)

A simple page that generates a browser bookmarklet for the recruiter.

Show:
- Explanation: "Save this button to your browser bookmarks bar. When you are on any job posting page click it to instantly import the JD into TalentAgent."
- A draggable button styled to look like a bookmark: "Import to TalentAgent"
- Instructions: "Drag the button above to your browser bookmarks bar"

The bookmarklet JavaScript:
```javascript
javascript:(function(){
  var text = document.body.innerText;
  var url = window.location.href;
  window.open('https://usetalentagent.com/dashboard/agents/new?jd=' + encodeURIComponent(text.substring(0, 5000)) + '&source=' + encodeURIComponent(url));
})();
```

This opens the new agent page with the page text pre-populated in the JD field and the source URL saved. When the recruiter lands on the new agent page the JD field should be pre-filled from the URL parameter and parsing should start automatically.

---

## URL Parameter Handling

Update `app/dashboard/agents/new/page.tsx` to handle incoming URL parameters from the bookmarklet:

```typescript
// At the top of the component
const searchParams = useSearchParams()
const prefilledJD = searchParams.get('jd')
const sourceUrl = searchParams.get('source')

// Auto-start parsing if JD is pre-filled
useEffect(() => {
  if (prefilledJD && prefilledJD.length > 100) {
    setJdText(decodeURIComponent(prefilledJD))
    setSourceUrl(sourceUrl || '')
    // Auto-trigger parse after 500ms
    setTimeout(() => handleParse(), 500)
  }
}, [prefilledJD])
```

---

## Recruiter Match Queue Updates

Add an ATS push button to revealed matches in the match queue.

When a match reaches `revealed` status show a new button:
"Push to [ATS name]" -- only visible if the recruiter has an ATS connected.

On click call `/api/ats/push-candidate` with the match ID and ATS type.

After successful push show a green badge on the match card: "Added to Greenhouse" or "Added to Lever."

---

## Automatic Matching on Agent Creation

Create `app/api/match/run-for-agent/route.ts`:

When a new buyer agent is created immediately run it against all candidates in the pool instead of waiting for the scheduled cron job.

```typescript
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { buyerAgentId } = await request.json()
  const supabase = createAdminClient()

  // Get the buyer agent
  const { data: buyerAgent } = await supabase
    .from('buyer_agents')
    .select('*, company_profiles(*)')
    .eq('id', buyerAgentId)
    .single()

  if (!buyerAgent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get all candidates with complete GitHub profiles and auto-match enabled
  const { data: candidates } = await supabase
    .from('candidate_profiles')
    .select('*, github_profiles(*), agent_settings(*)')
    .eq('github_profiles.ingestion_status', 'complete')

  let matchesCreated = 0

  for (const candidate of candidates || []) {
    // Skip if already matched
    const { data: existing } = await supabase
      .from('autonomous_matches')
      .select('id')
      .eq('candidate_id', candidate.user_id)
      .eq('buyer_agent_id', buyerAgentId)
      .single()

    if (existing) continue

    // Quick pre-filter
    const preFilterScore = calculatePreFilterScore(candidate, buyerAgent)
    if (preFilterScore < 30) continue

    // Run coordinator assessment
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/coordinate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.user_id,
          buyerAgentId: buyerAgentId,
          jobPostingId: null
        })
      })
      matchesCreated++
    } catch (err) {
      console.error('Match failed for candidate:', candidate.user_id, err)
    }
  }

  return NextResponse.json({ matchesCreated })
}

function calculatePreFilterScore(candidate: any, buyerAgent: any): number {
  let score = 0
  
  const fingerprint = candidate.github_profiles?.technical_fingerprint
  if (!fingerprint) return 0

  // Language overlap
  const candidateLangs = fingerprint.primary_languages?.map((l: any) => l.language.toLowerCase()) || []
  const requiredSkills = buyerAgent.required_skills?.map((s: string) => s.toLowerCase()) || []
  const overlap = candidateLangs.filter((l: string) => 
    requiredSkills.some((s: string) => s.includes(l) || l.includes(s))
  )
  score += overlap.length * 15

  // Experience range
  const years = candidate.years_of_experience || 0
  const minYears = buyerAgent.years_experience_min || 0
  const maxYears = buyerAgent.years_experience_max || 20
  if (years >= minYears && years <= maxYears + 2) score += 20

  // Comp alignment
  if (candidate.comp_min && buyerAgent.comp_band_max) {
    if (candidate.comp_min <= buyerAgent.comp_band_max) score += 15
  }

  // Visa conflict
  if (candidate.visa_sponsorship_required && !buyerAgent.visa_sponsorship_available) {
    return 0 // Hard filter
  }

  return Math.min(score, 100)
}
```

---

## Navigation Updates

Add to recruiter sidebar:
- Dashboard
- Companies
- Buyer Agents (update label from "Agents" for clarity)
- **Integrations** (new -- ATS connections + bookmarklet)
- Match Queue
- Roles

---

## Build Order

1. Run the new SQL
2. Build `app/api/jd/parse/route.ts`
3. Build `app/api/jd/create-agent/route.ts`
4. Redesign `app/dashboard/agents/new/page.tsx` with the three-step JD-first flow
5. Build `app/api/ats/push-candidate/route.ts`
6. Build `app/dashboard/integrations/page.tsx` with Greenhouse, Lever, and Other cards
7. Build `app/dashboard/integrations/bookmarklet/page.tsx`
8. Build `app/api/match/run-for-agent/route.ts`
9. Update the match queue to show ATS push button on revealed matches
10. Update recruiter sidebar navigation
11. Test the full flow: paste JD → review parsed fields → answer questions → agent created → matches run automatically

---

## What Success Looks Like

A recruiter visits usetalentagent.com for the first time. They paste a job description. Within 30 seconds they see a fully structured buyer agent with all fields populated. They answer three targeted questions in two minutes. They click create. Within five minutes they see their first candidate matches in the queue -- no sourcing, no screening, no phone calls.

That is the product experience that creates word-of-mouth in recruiting circles.

The bookmarklet means they never have to open TalentAgent first -- they are on a Greenhouse job posting, click the bookmark, and the JD is already there. That is the friction reduction that makes this a daily habit rather than an occasional tool.

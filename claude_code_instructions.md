# Claude Code Build Instructions: TalentAgent MVP

## What You Are Building

A two-sided recruiting platform where:
- **Candidates** build rich profiles that go far beyond a resume -- projects, architecture decisions, honest skill assessments, work preferences
- **Recruiters** create buyer agents by uploading job descriptions plus context that never makes it into a JD
- **A matching engine** powered by the Anthropic API runs candidate profiles against job requirements and produces a structured fit report
- **The core thesis**: reduce 100 hours of recruiter phone screens to 5 hours by surfacing only genuinely qualified candidates with evidence attached

---

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database + Auth + Storage**: Supabase
- **AI**: Anthropic API (claude-sonnet-4-20250514)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Forms**: React Hook Form
- **Notifications**: react-hot-toast

Do not deviate from this stack. Do not add unnecessary dependencies.

---

## Environment Variables Required

Create a `.env.local` file with these variables. Tell the user to fill them in:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Schema

Run these SQL commands in the Supabase SQL editor. Create them in this exact order:

```sql
-- User profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('candidate', 'recruiter')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Candidate profiles (rich data model)
create table public.candidate_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  
  -- Structured data
  current_title text,
  years_of_experience integer,
  primary_languages text[], -- e.g. ['Python', 'Go', 'TypeScript']
  frameworks_and_tools text[], -- e.g. ['React', 'Kubernetes', 'Postgres']
  cloud_platforms text[], -- e.g. ['AWS', 'GCP']
  
  -- Honest self assessment (scale 1-5 per skill stored as jsonb)
  skill_assessments jsonb default '{}',
  
  -- Narrative fields (the real differentiator)
  systems_built jsonb default '[]', -- array of {name, description, scale, architecture_decisions, what_i_would_do_differently}
  hardest_problems jsonb default '[]', -- array of {problem, context, how_resolved, outcome}
  honest_strengths text,
  honest_gaps text, -- counterintuitive but critical for trust
  
  -- Work preferences
  remote_preference text check (remote_preference in ('remote_only', 'hybrid', 'onsite', 'flexible')),
  preferred_company_stage text[], -- e.g. ['seed', 'series_a', 'growth', 'enterprise']
  preferred_team_size text check (preferred_team_size in ('small', 'medium', 'large', 'any')),
  preferred_engineering_culture text,
  management_style_preference text,
  
  -- Role requirements
  target_roles text[],
  target_industries text[],
  comp_min integer, -- annual in USD
  comp_max integer,
  open_to_equity boolean default true,
  visa_sponsorship_required boolean default false,
  available_start text, -- 'immediately', '2_weeks', '1_month', '3_months'
  hard_dealbreakers text,
  
  -- What they are optimizing for in next role
  next_role_priorities text,
  
  -- Resume upload (stored in Supabase storage)
  resume_url text,
  
  -- Profile completion score (0-100)
  completion_score integer default 0,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Recruiter buyer agents (job requirements)
create table public.buyer_agents (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Role basics
  role_title text not null,
  company_name text not null,
  
  -- The job description (raw paste or upload)
  job_description text not null,
  
  -- Context that never makes it into the JD (the real value)
  why_last_candidates_failed text,
  what_hiring_manager_actually_cares_about text,
  team_dynamics text,
  hidden_dealbreakers text, -- sensitive requirements not in public JD
  actual_remote_flexibility text, -- vs what HR approved
  comp_band_min integer,
  comp_band_max integer,
  
  -- Structured requirements parsed from JD + context
  required_skills text[],
  preferred_skills text[],
  years_experience_min integer,
  years_experience_max integer,
  
  -- Status
  status text default 'active' check (status in ('active', 'filled', 'paused')),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Fit assessments (output of the matching engine)
create table public.fit_assessments (
  id uuid default gen_random_uuid() primary key,
  buyer_agent_id uuid references public.buyer_agents(id) on delete cascade not null,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade not null,
  recruiter_id uuid references public.profiles(id) not null,
  
  -- The structured fit report (JSON from Anthropic API)
  fit_report jsonb not null,
  
  -- Overall scores
  overall_fit_score integer check (overall_fit_score between 0 and 100),
  technical_fit_score integer check (technical_fit_score between 0 and 100),
  role_fit_score integer check (role_fit_score between 0 and 100),
  
  -- Recommendation
  recommendation text check (recommendation in ('strong_yes', 'yes', 'maybe', 'no')),
  recommendation_summary text,
  
  -- Recruiter feedback after human review
  recruiter_feedback text,
  recruiter_rating integer check (recruiter_rating between 1 and 5),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.buyer_agents enable row level security;
alter table public.fit_assessments enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Candidate profiles: candidates own their data, recruiters can read
create policy "Candidates manage own profile" on public.candidate_profiles for all using (auth.uid() = user_id);
create policy "Recruiters can view candidate profiles" on public.candidate_profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'recruiter')
);

-- Buyer agents: recruiters manage their own
create policy "Recruiters manage own buyer agents" on public.buyer_agents for all using (auth.uid() = recruiter_id);

-- Fit assessments: recruiters see their own, candidates see assessments about them
create policy "Recruiters manage own assessments" on public.fit_assessments for all using (auth.uid() = recruiter_id);
create policy "Candidates view own assessments" on public.fit_assessments for select using (
  exists (
    select 1 from public.candidate_profiles cp
    where cp.id = candidate_profile_id and cp.user_id = auth.uid()
  )
);

-- Trigger to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_candidate_profiles_updated_at before update on public.candidate_profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_buyer_agents_updated_at before update on public.buyer_agents
  for each row execute procedure public.handle_updated_at();
```

---

## Project Structure

Build exactly this file structure:

```
src/
  app/
    (auth)/
      login/
        page.tsx
      signup/
        page.tsx
    (dashboard)/
      layout.tsx  -- shared dashboard shell with nav
      candidate/
        page.tsx  -- candidate dashboard home
        profile/
          page.tsx  -- rich profile builder
      recruiter/
        page.tsx  -- recruiter dashboard home
        roles/
          page.tsx  -- list of buyer agents
          new/
            page.tsx  -- create new buyer agent
          [id]/
            page.tsx  -- individual role + run assessments
    api/
      assess/
        route.ts  -- Anthropic API call for fit assessment
      profile-completion/
        route.ts  -- calculate completion score
    page.tsx  -- landing page
    layout.tsx
  components/
    ui/
      Button.tsx
      Card.tsx
      Badge.tsx
      Input.tsx
      Textarea.tsx
      Select.tsx
      Progress.tsx
    candidate/
      ProfileSections.tsx  -- all profile form sections
      SystemBuiltCard.tsx
      HardProblemCard.tsx
    recruiter/
      BuyerAgentForm.tsx
      FitReportCard.tsx
      AssessmentScore.tsx
    shared/
      Navbar.tsx
      LoadingSpinner.tsx
  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
    anthropic/
      client.ts
      prompts.ts  -- all system prompts
    utils.ts
  types/
    index.ts  -- all TypeScript types
```

---

## Detailed Page Specifications

### Landing Page (`app/page.tsx`)

Clean, minimal. Dark navy background (#0F172A). Two columns.

Left column:
- Small badge: "Now in beta"
- H1: "Stop wasting 100 hours on phone screens"
- Subheading: "TalentAgent matches engineers to roles based on what they actually built -- not how they formatted a resume. Recruiters get pre-qualified candidates with evidence. Engineers get represented by an agent that knows their real work."
- Two CTA buttons: "I'm a recruiter" (primary, white) → `/signup?role=recruiter` and "I'm an engineer" (secondary, outlined) → `/signup?role=candidate`
- Small social proof line: "Trusted by 3 technical recruiting firms. Currently in private beta."

Right column:
- Show a mockup of the fit report card (static, visual only)

### Signup (`app/(auth)/signup/page.tsx`)

Simple centered card. Fields:
- Full name
- Email
- Password
- Role selector: "I'm hiring" / "I'm looking" (visually toggle, not dropdown)
- If role=recruiter or role=candidate pre-fill from query param

On submit: create Supabase auth user, insert into profiles table, redirect to appropriate dashboard.

### Login (`app/(auth)/login/page.tsx`)

Standard email/password login. Redirect to `/candidate` or `/recruiter` based on profile role.

### Dashboard Layout (`app/(dashboard)/layout.tsx`)

Persistent sidebar navigation. White background.

Sidebar:
- Logo top left: "TalentAgent"
- Navigation items differ by role:
  - Candidate: Dashboard, My Profile, My Assessments
  - Recruiter: Dashboard, My Roles, Candidate Pool, Assessments
- User email + logout at bottom

### Candidate Profile Builder (`app/(dashboard)/candidate/profile/page.tsx`)

This is the most important page in the entire app. Get this right.

Show a completion progress bar at the top (0-100%). Each section contributes to completion.

Break into clearly labeled sections with a sticky section nav on the left:

**Section 1: Basics**
- Current title (text input)
- Years of experience (number)
- Primary programming languages (tag input -- user types and hits enter to add tags)
- Frameworks and tools (tag input)
- Cloud platforms (tag input)

**Section 2: Skill Honest Assessment**
Explanatory text: "Rate your actual production proficiency, not your resume proficiency. This builds trust with recruiters and gets you matched to roles where your skills actually fit."

For each language they entered in Section 1, show a 1-5 slider:
- 1: "I've used it but wouldn't call myself proficient"
- 2: "Comfortable with the basics"
- 3: "Solid, use it regularly in production"
- 4: "Strong, could mentor others"
- 5: "Expert, deep internals knowledge"

**Section 3: Systems You've Built**
Explanatory text: "This is where you differentiate yourself from every other resume. Tell us what you actually built."

Allow up to 5 system entries. For each:
- System name (text)
- What it did (textarea, 2-3 sentences)
- Scale: users served / requests per second / data volume / team size (text -- let them describe it naturally)
- Architecture decisions you made and why (textarea -- this is the gold)
- What you would do differently today (textarea -- shows self-awareness)

Add/remove system entries dynamically.

**Section 4: Hardest Problems You've Solved**
Explanatory text: "Pick 1-2 technical challenges that genuinely tested you. Not the ones that look good -- the ones that were actually hard."

Allow up to 2 entries. For each:
- Problem description (textarea)
- What made it hard (textarea)
- How you resolved it (textarea)
- Outcome (textarea)

**Section 5: Honest Self Assessment**
- Genuine strengths (textarea): "Where do you consistently outperform? Be specific."
- Genuine gaps (textarea): "What are you still developing? Recruiters trust candidates who know their limits."
- What kind of problems genuinely interest you (textarea)

**Section 6: Work Preferences**
- Remote preference (radio: Remote only / Hybrid / Onsite / Flexible)
- Preferred company stage (multi-select checkboxes: Seed / Series A / Series B / Growth / Public / Any)
- Preferred team size (radio: Small <10 / Medium 10-50 / Large 50+ / Any)
- Engineering culture preference (textarea: "Describe the environment where you've done your best work")
- Management style preference (textarea)

**Section 7: Role Requirements**
- Target roles (tag input)
- Target industries (tag input)
- Minimum compensation (number input, USD annual)
- Maximum compensation (number input)
- Open to equity (toggle)
- Visa sponsorship required (toggle -- important for matching)
- Available to start (select: Immediately / 2 weeks / 1 month / 3 months)
- Hard dealbreakers (textarea): "What would immediately disqualify a role regardless of everything else?"
- What you're optimizing for in your next role (textarea): "Beyond comp -- what does a great next role look like for you?"

**Save behavior**: Auto-save on blur for each field. Show a subtle "Saved" indicator. Do not require clicking a save button.

### Recruiter: New Role (`app/(dashboard)/recruiter/roles/new/page.tsx`)

Two-column layout.

Left column (form):

**Section 1: Role Basics**
- Role title
- Company name
- Status (Active / Paused)

**Section 2: Job Description**
- Large textarea: "Paste your job description here"
- Helper text: "Don't worry about formatting -- we'll parse it"

**Section 3: The Context That Never Makes It Into the JD**
Explanatory text: "This is where your buyer agent gets smart. The more context you give here, the better the matching."

Fields:
- Why have the last candidates failed at this role? (textarea)
- What does the hiring manager actually care about most? (textarea): "Not what the JD says -- what really matters to them"
- Team dynamics (textarea): "What kind of person thrives here? What kind struggles?"
- Hidden dealbreakers (textarea): "Requirements that are real but too sensitive to publish"
- Actual remote flexibility (textarea): "What HR approved vs reality"

**Section 4: Compensation**
- Band minimum (number, USD)
- Band maximum (number, USD)

Right column (preview):
Static card showing what the buyer agent "knows" based on what's been filled in so far. Updates as recruiter types.

On submit: save to buyer_agents table, redirect to role detail page.

### Recruiter: Role Detail (`app/(dashboard)/recruiter/roles/[id]/page.tsx`)

Three sections:

**Top**: Role summary card. Title, company, status badge, created date. Edit button.

**Middle**: Run Assessment section.
- Heading: "Run a fit assessment"
- Search/select candidates from the candidate pool (show name, title, completion score)
- "Run Assessment" button -- calls `/api/assess` with buyer_agent_id and candidate_profile_id
- Loading state: "Analyzing candidate profile against role requirements..."

**Bottom**: Previous Assessments
- List of all fit assessments run for this role
- Each shows: candidate name, overall score, recommendation badge, date, expand to see full report

### Fit Report Display

The fit report is the core output. Display it as a structured card:

**Header**:
- Candidate name and current title
- Overall fit score (large number, color coded: 80+ green, 60-79 amber, below 60 red)
- Recommendation badge: Strong Yes / Yes / Maybe / No

**Score breakdown**:
- Technical fit score with progress bar
- Role fit score with progress bar

**Requirement-by-requirement breakdown** (from fit_report.requirements array):
Each requirement shows:
- Requirement name
- Pass / Partial / Fail badge
- Evidence: specific text from candidate profile that supports the judgment
- Confidence level

**Flags section**:
- Green flags: specific strengths that stand out
- Yellow flags: areas to probe in a human conversation
- Red flags: genuine concerns

**Recommendation narrative**:
2-3 paragraph summary the recruiter can read in 30 seconds

**Recruiter feedback section**:
- "Was this assessment accurate?" 1-5 star rating
- Free text feedback
- This data trains the system over time

---

## API Route: Fit Assessment (`app/api/assess/route.ts`)

This is the most critical piece of logic. Get it exactly right.

```typescript
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { buyerAgentId, candidateProfileId } = await request.json()
  
  // Fetch buyer agent
  const { data: buyerAgent } = await supabase
    .from('buyer_agents')
    .select('*')
    .eq('id', buyerAgentId)
    .single()
    
  // Fetch candidate profile with user info
  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('*, profiles(full_name, email)')
    .eq('id', candidateProfileId)
    .single()
    
  if (!buyerAgent || !candidateProfile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  // Build the prompt
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(buyerAgent, candidateProfile)
  
  // Call Anthropic
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  })
  
  // Parse the JSON response
  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  const fitReport = JSON.parse(responseText)
  
  // Save to database
  const { data: assessment } = await supabase
    .from('fit_assessments')
    .insert({
      buyer_agent_id: buyerAgentId,
      candidate_profile_id: candidateProfileId,
      recruiter_id: user.id,
      fit_report: fitReport,
      overall_fit_score: fitReport.overall_fit_score,
      technical_fit_score: fitReport.technical_fit_score,
      role_fit_score: fitReport.role_fit_score,
      recommendation: fitReport.recommendation,
      recommendation_summary: fitReport.recommendation_summary
    })
    .select()
    .single()
    
  return NextResponse.json({ assessment })
}
```

---

## Anthropic Prompts (`lib/anthropic/prompts.ts`)

These prompts are the heart of the product. Write them carefully.

```typescript
export function buildSystemPrompt(): string {
  return `You are an expert technical recruiter with 15 years of experience placing senior software engineers at top technology companies. 

Your job is to produce structured, honest, evidence-based fit assessments that tell a recruiter exactly whether a candidate is worth a human conversation -- and why.

You are not a cheerleader. You are not trying to advance candidates through the funnel. You are trying to save recruiters time by being ruthlessly accurate.

Your assessments have three qualities that make them valuable:
1. Every judgment is backed by specific evidence from the candidate's profile
2. You flag gaps and concerns as clearly as you flag strengths
3. Your recommendation matches your analysis -- if the evidence is mixed, say so

You must respond with ONLY valid JSON. No preamble, no explanation outside the JSON structure. The JSON must exactly match this schema:

{
  "overall_fit_score": <integer 0-100>,
  "technical_fit_score": <integer 0-100>,
  "role_fit_score": <integer 0-100>,
  "recommendation": <"strong_yes" | "yes" | "maybe" | "no">,
  "recommendation_summary": <string, 2-3 sentences, plain language, what the recruiter needs to know in 30 seconds>,
  "requirements": [
    {
      "requirement": <string, the specific requirement being assessed>,
      "verdict": <"pass" | "partial" | "fail">,
      "evidence": <string, specific text or reference from candidate profile that supports this verdict>,
      "confidence": <"high" | "medium" | "low">,
      "notes": <string, any nuance or caveat the recruiter should know>
    }
  ],
  "green_flags": [
    {
      "flag": <string, specific strength>,
      "evidence": <string, what in the profile supports this>
    }
  ],
  "yellow_flags": [
    {
      "flag": <string, area to probe in human conversation>,
      "suggested_question": <string, the specific question to ask>
    }
  ],
  "red_flags": [
    {
      "flag": <string, genuine concern>,
      "severity": <"minor" | "significant" | "dealbreaker">,
      "reasoning": <string>
    }
  ],
  "compensation_alignment": {
    "aligned": <boolean>,
    "notes": <string, specific analysis of comp overlap or gap>
  },
  "visa_flag": <boolean, true if visa sponsorship is required but role may not support it>,
  "questions_for_human_screen": [
    <string, specific question to ask in the first human conversation, max 5 questions>
  ]
}`
}

export function buildUserPrompt(buyerAgent: any, candidateProfile: any): string {
  return `
## Role Requirements

**Role**: ${buyerAgent.role_title} at ${buyerAgent.company_name}

**Job Description**:
${buyerAgent.job_description}

**Context the recruiter added (not in JD)**:
- Why last candidates failed: ${buyerAgent.why_last_candidates_failed || 'Not provided'}
- What hiring manager actually cares about: ${buyerAgent.what_hiring_manager_actually_cares_about || 'Not provided'}
- Team dynamics: ${buyerAgent.team_dynamics || 'Not provided'}
- Hidden dealbreakers: ${buyerAgent.hidden_dealbreakers || 'Not provided'}
- Actual remote flexibility: ${buyerAgent.actual_remote_flexibility || 'Not provided'}
- Compensation band: $${buyerAgent.comp_band_min?.toLocaleString() || 'Not specified'} - $${buyerAgent.comp_band_max?.toLocaleString() || 'Not specified'}

---

## Candidate Profile

**Name**: ${candidateProfile.profiles?.full_name || 'Anonymous'}
**Current Title**: ${candidateProfile.current_title || 'Not provided'}
**Years of Experience**: ${candidateProfile.years_of_experience || 'Not provided'}

**Technical Skills**:
- Primary languages: ${candidateProfile.primary_languages?.join(', ') || 'Not provided'}
- Frameworks and tools: ${candidateProfile.frameworks_and_tools?.join(', ') || 'Not provided'}
- Cloud platforms: ${candidateProfile.cloud_platforms?.join(', ') || 'Not provided'}

**Skill Self-Assessment**:
${JSON.stringify(candidateProfile.skill_assessments, null, 2)}

**Systems Built**:
${candidateProfile.systems_built?.map((s: any, i: number) => `
System ${i + 1}: ${s.name}
- What it did: ${s.description}
- Scale: ${s.scale}
- Architecture decisions: ${s.architecture_decisions}
- What I'd do differently: ${s.what_i_would_do_differently}
`).join('\n') || 'None provided'}

**Hardest Problems Solved**:
${candidateProfile.hardest_problems?.map((p: any, i: number) => `
Problem ${i + 1}:
- What the problem was: ${p.problem}
- What made it hard: ${p.context}
- How resolved: ${p.how_resolved}
- Outcome: ${p.outcome}
`).join('\n') || 'None provided'}

**Honest Self Assessment**:
- Genuine strengths: ${candidateProfile.honest_strengths || 'Not provided'}
- Genuine gaps: ${candidateProfile.honest_gaps || 'Not provided'}
- Problems that genuinely interest them: ${candidateProfile.next_role_priorities || 'Not provided'}

**Work Preferences**:
- Remote preference: ${candidateProfile.remote_preference || 'Not specified'}
- Preferred company stage: ${candidateProfile.preferred_company_stage?.join(', ') || 'Not specified'}
- Preferred team size: ${candidateProfile.preferred_team_size || 'Not specified'}
- Engineering culture preference: ${candidateProfile.preferred_engineering_culture || 'Not specified'}
- Management style preference: ${candidateProfile.management_style_preference || 'Not specified'}

**Role Requirements**:
- Target roles: ${candidateProfile.target_roles?.join(', ') || 'Not specified'}
- Target industries: ${candidateProfile.target_industries?.join(', ') || 'Not specified'}
- Compensation expectation: $${candidateProfile.comp_min?.toLocaleString() || '?'} - $${candidateProfile.comp_max?.toLocaleString() || '?'}
- Visa sponsorship required: ${candidateProfile.visa_sponsorship_required ? 'YES' : 'No'}
- Available to start: ${candidateProfile.available_start || 'Not specified'}
- Hard dealbreakers: ${candidateProfile.hard_dealbreakers || 'None stated'}

---

Produce your fit assessment JSON now. Be honest. Be specific. Cite evidence from the profile for every judgment.`
}
```

---

## UI Design Principles

Follow these precisely:

**Colors**:
- Primary: `#0F172A` (dark navy) for headers and primary actions
- Accent: `#6366F1` (indigo) for interactive elements and highlights
- Success: `#10B981` (green) for pass verdicts and positive scores
- Warning: `#F59E0B` (amber) for partial verdicts and yellow flags
- Danger: `#EF4444` (red) for fail verdicts and red flags
- Background: `#F8FAFC` (off-white) for page backgrounds
- Card background: `#FFFFFF`
- Muted text: `#64748B`

**Typography**:
- Font: Inter (import from Google Fonts)
- Headings: font-weight 600
- Body: font-weight 400
- Use `text-sm` for labels and metadata

**Cards**: White background, `rounded-xl`, `shadow-sm`, `border border-slate-100`

**Buttons**:
- Primary: `bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2`
- Secondary: `border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2`

**Scores**: Display as circular progress rings using SVG, color-coded by score range

**Badges**:
- Strong Yes: `bg-green-100 text-green-800`
- Yes: `bg-emerald-100 text-emerald-800`
- Maybe: `bg-amber-100 text-amber-800`
- No: `bg-red-100 text-red-800`
- Pass: `bg-green-100 text-green-700`
- Partial: `bg-amber-100 text-amber-700`
- Fail: `bg-red-100 text-red-700`

---

## Completion Score Calculation

Calculate candidate profile completion score as follows:

- Basic info (title, experience): 10 points
- Technical skills (languages, frameworks, cloud): 15 points
- Skill assessments completed: 10 points
- At least 2 systems built with all fields: 25 points
- At least 1 hard problem with all fields: 15 points
- Honest self-assessment (strengths + gaps): 10 points
- Work preferences complete: 10 points
- Role requirements complete (comp + availability): 5 points

Total: 100 points

Show completion score prominently on the candidate dashboard and encourage completion.

---

## Candidate Dashboard Home

Show:
- Completion score as a large circular progress ring
- Checklist of incomplete sections with direct links
- If score < 60: banner saying "Your profile needs more detail before your agent can match you effectively"
- If score >= 80: banner saying "Your agent is active and matching you against open roles"
- Recent assessments (if any) -- blurred/anonymized company names until both sides express interest

---

## Recruiter Dashboard Home

Show:
- Summary stats: Active Roles, Total Assessments Run, Strong Yes candidates this week
- List of active buyer agents with quick stats
- Quick action: "Add New Role" button prominent
- Recent assessments across all roles in a feed

---

## Error Handling

- All API routes must return appropriate error messages
- Handle Supabase auth errors gracefully -- redirect to login
- Handle Anthropic API errors -- show user-friendly message "Assessment failed, please try again"
- Handle JSON parse failures from Anthropic -- retry once, then show error
- Loading states on all async operations

---

## Important Implementation Notes

1. The Anthropic API call can take 15-30 seconds. Show a proper loading state with a progress indicator and messages like "Reading candidate profile...", "Analyzing technical fit...", "Generating assessment..."

2. Auto-save on the candidate profile form is critical. Use debounced updates (500ms) to Supabase on every field change. Show a subtle "Saving..." / "Saved" indicator.

3. The tag input components (for languages, frameworks, etc.) should allow users to type and hit Enter or comma to add a tag, and click X to remove.

4. Mobile responsive is not the priority for MVP -- optimize for desktop recruiter workflow.

5. Never show one candidate's data to another candidate. The RLS policies handle this at the database level but double-check all queries.

6. The JSON response from Anthropic must be parsed carefully. Wrap in try/catch and handle malformed JSON.

7. Recruiter can run multiple assessments for the same role against different candidates. All results are stored and visible on the role detail page sorted by overall_fit_score descending.

---

## What to Build First (Order of Operations)

1. Supabase project setup and schema
2. Auth (signup/login with role selection)
3. Dashboard layout shell
4. Candidate profile builder (the most important thing)
5. Buyer agent creation form
6. Anthropic API route for fit assessment
7. Fit report display component
8. Recruiter role detail page tying it all together
9. Landing page last

---

## When You Are Done

The recruiter should be able to:
1. Sign up as a recruiter
2. Create a buyer agent by pasting a JD and adding context
3. Select a candidate from the pool
4. Click "Run Assessment"
5. See a detailed fit report in under 30 seconds

The candidate should be able to:
1. Sign up as a candidate
2. Build a rich profile across all 7 sections
3. See their completion score
4. Eventually see (anonymized) that their profile matched roles

That is a complete MVP. Ship that. Nothing else until those flows work end to end.

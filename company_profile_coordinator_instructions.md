# Additional Build Instructions: Company Profiles + Coordinator Agent

## Add These On Top of the Existing Agentic Layer Instructions

---

## Part 1: Company Profile

### New Database Table

Run this SQL in Supabase SQL editor:

```sql
-- Company knowledge base (persistent context above individual roles)
create table public.company_profiles (
  id uuid default gen_random_uuid() primary key,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Basic identity
  company_name text not null,
  company_website text,
  company_size text check (company_size in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  company_stage text check (company_stage in ('seed', 'series_a', 'series_b', 'series_c', 'growth', 'public')),
  industry text,
  headquarters text,
  founded_year integer,
  
  -- Tech stack (unlikely to change by role)
  core_languages text[],          -- e.g. ['Python', 'Go', 'TypeScript']
  core_frameworks text[],         -- e.g. ['React', 'Django', 'Kubernetes']
  core_infrastructure text[],     -- e.g. ['AWS', 'Postgres', 'Redis']
  core_tools text[],              -- e.g. ['GitHub', 'Datadog', 'PagerDuty']
  crm_and_business_tools text[],  -- e.g. ['Salesforce', 'Jira', 'Notion']
  
  -- Engineering culture (unlikely to change by role)
  engineering_values text,        -- what the engineering org actually believes
  engineering_culture text,       -- how the team operates day to day
  deployment_frequency text,      -- how often they ship
  oncall_expectations text,       -- what oncall looks like
  code_review_culture text,       -- how they approach code review
  architecture_philosophy text,   -- monolith vs microservices, opinions on tech debt etc
  
  -- What makes someone successful here
  traits_of_successful_engineers text,
  traits_that_struggle_here text, -- honest about who doesn't thrive
  
  -- Why engineers join and why they leave
  why_engineers_join text,        -- real reasons, not marketing copy
  why_engineers_leave text,       -- honest -- this builds candidate trust
  
  -- Benefits (unlikely to change by role)
  base_comp_philosophy text,      -- how they think about comp (top of market, bands, etc)
  equity_structure text,          -- options vs RSUs, typical grant size, vesting
  health_benefits text,
  pto_policy text,
  remote_policy text,             -- company-wide stance on remote work
  learning_and_development text,  -- budget, conferences, courses
  other_benefits text,
  
  -- Interview process
  interview_process_overview text, -- what candidates should expect
  typical_timeline text,           -- how long the process takes
  interview_stages jsonb default '[]',
  -- Array of {stage_name, description, what_we_are_assessing, duration_minutes}
  
  -- Employer brand signals
  glassdoor_rating numeric(3,1),
  notable_engineering_blog_url text,
  open_source_projects text[],
  
  -- What the recruiter wants the buyer agent to always know
  always_emphasize text,  -- things to always highlight to candidates
  never_misrepresent text, -- things the recruiter wants to be honest about
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Link buyer agents to company profiles
alter table public.buyer_agents 
  add column company_profile_id uuid references public.company_profiles(id);

-- RLS
alter table public.company_profiles enable row level security;

create policy "Recruiters manage own company profiles" 
  on public.company_profiles for all 
  using (auth.uid() = recruiter_id);

create policy "Candidates can view company profiles" 
  on public.company_profiles for select 
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'candidate'
    )
  );

create trigger handle_company_profiles_updated_at 
  before update on public.company_profiles
  for each row execute procedure public.handle_updated_at();
```

---

### New Page: Company Profile Builder

**`app/dashboard/companies/new/page.tsx`** and **`app/dashboard/companies/[id]/page.tsx`**

This is the recruiter's equivalent of the candidate profile builder. Set it up once per company. All future roles at that company inherit this context automatically.

**Page layout:**

Left sidebar with section navigation (same pattern as candidate profile builder).
Right side is the form. Auto-save on every field change.

Show a completion indicator at the top. Incomplete company profiles show a warning when creating a new role: "Your company profile is only 40% complete. A richer company profile produces better candidate matches."

---

**Section 1: Company Basics**

Fields:
- Company name (text)
- Website (text)
- Company size (select: 1-10 / 11-50 / 51-200 / 201-500 / 501-1000 / 1000+)
- Stage (select: Seed / Series A / Series B / Series C / Growth / Public)
- Industry (text)
- Headquarters location (text)
- Year founded (number)

---

**Section 2: Tech Stack**

Explanatory text: "Add everything engineers actually use, not just what's in job descriptions. This helps your buyer agent accurately assess technical fit across all roles."

Fields (all tag inputs):
- Core programming languages
- Frameworks and libraries
- Infrastructure and DevOps tools
- Databases and data stores
- Business and productivity tools (CRM, project management, etc.)

Helper text under business tools: "Include tools like Salesforce, Jira, Notion, Slack -- candidates often ask about these."

---

**Section 3: Engineering Culture**

Explanatory text: "Be honest here. Candidates whose agents match them to roles where the culture fits stay longer and perform better. Overselling leads to bad hires."

Fields:
- Engineering values (textarea): "What does your engineering org genuinely believe? What principles guide technical decisions?"
- Day-to-day culture (textarea): "Describe a typical week for an engineer here. How do teams operate?"
- Deployment frequency (text): "How often do you ship to production?"
- Oncall expectations (textarea): "What does oncall look like? How many incidents per week? What's the escalation process?"
- Code review culture (textarea): "How thorough are reviews? What's the feedback style?"
- Architecture philosophy (textarea): "Monolith or microservices? How do you handle tech debt? What are your strong opinions?"

---

**Section 4: Fit Signals**

Explanatory text: "This is the most valuable section for matching. Be direct."

Fields:
- Traits of engineers who thrive here (textarea): "Be specific. What have your best hires had in common?"
- Traits of engineers who struggle here (textarea): "What kinds of people consistently don't work out? This helps filter mismatches before anyone wastes time."
- Why engineers join (textarea): "Real reasons -- not the press release version."
- Why engineers leave (textarea): "Be honest. Candidates will find out anyway and trust you more for saying it upfront."

---

**Section 5: Compensation and Benefits**

Fields:
- Compensation philosophy (textarea): "How do you think about comp? Top of market? Bands? Equity-heavy?"
- Equity structure (textarea): "Options or RSUs? Typical grant range? Vesting schedule? Cliff?"
- Health benefits (textarea): "Coverage level, who pays premiums, dental/vision?"
- PTO policy (text): "Unlimited? Accrual? Minimum encouraged days?"
- Remote policy (textarea): "Company-wide stance. Be specific about expectations."
- Learning and development (textarea): "Budget per engineer? Conference attendance? Internal training?"
- Other notable benefits (textarea)

---

**Section 6: Interview Process**

Explanatory text: "Candidates whose agents know the process upfront are better prepared and have higher offer acceptance rates."

Fields:
- Process overview (textarea): "What does the full process look like from first contact to offer?"
- Typical timeline (text): "How long does the process take end to end?"
- Interview stages (dynamic form -- add/remove stages):
  Each stage has:
  - Stage name (text): e.g. "Technical Screen"
  - Description (text): what happens in this stage
  - What you are assessing (text): what you are looking for
  - Duration (number, minutes)

---

**Section 7: Agent Instructions**

Explanatory text: "Tell your buyer agent what to always emphasize and what to be transparent about."

Fields:
- Always emphasize to candidates (textarea): "What should your agent always highlight? What do candidates consistently get excited about?"
- Be honest about (textarea): "What should your agent be upfront about even if it's not a selling point? This builds trust."

---

### Updated Buyer Agent Creation Flow

When a recruiter creates a new buyer agent, add a step before the role details:

**Step 0: Select or create company profile**

Show a dropdown of existing company profiles the recruiter has created.
- If they select one: the buyer agent inherits all company context automatically
- If none exist: show a CTA to create one first, with a note: "Setting up a company profile takes 15 minutes and dramatically improves matching quality for all your roles at this company"
- Allow skipping for now with a warning

When a company profile is selected, show a preview card:
"Your buyer agent will know: [tech stack chips] [culture summary snippet] [benefits summary]"

This makes the value of the company profile immediately tangible.

---

### How the Buyer Agent Uses Company Profile Context

Update the buyer agent system prompt to inject company profile data:

```typescript
export function buildBuyerAgentPrompt(buyerAgent: any, companyProfile: any): string {
  const companyContext = companyProfile ? `
## Company Knowledge Base (apply to all assessments for this company)

Tech stack candidates must be comfortable with:
- Languages: ${companyProfile.core_languages?.join(', ') || 'Not specified'}
- Frameworks: ${companyProfile.core_frameworks?.join(', ') || 'Not specified'}  
- Infrastructure: ${companyProfile.core_infrastructure?.join(', ') || 'Not specified'}
- Tools: ${companyProfile.core_tools?.join(', ') || 'Not specified'}

Engineering culture:
${companyProfile.engineering_culture || 'Not specified'}

What makes engineers successful here:
${companyProfile.traits_of_successful_engineers || 'Not specified'}

What kinds of engineers struggle here:
${companyProfile.traits_that_struggle_here || 'Not specified'}

Compensation philosophy:
${companyProfile.base_comp_philosophy || 'Not specified'}

Remote policy:
${companyProfile.remote_policy || 'Not specified'}

Always emphasize to candidates:
${companyProfile.always_emphasize || 'Nothing specified'}

Be honest about:
${companyProfile.never_misrepresent || 'Nothing specified'}
` : 'No company profile configured for this role.'

  return `You are the buyer agent for ${buyerAgent.company_name}, representing the hiring team for the ${buyerAgent.role_title} role.

${companyContext}

## This Specific Role

Job description:
${buyerAgent.job_description}

Context the recruiter added:
- Why last candidates failed: ${buyerAgent.why_last_candidates_failed || 'Not provided'}
- What the hiring manager actually cares about: ${buyerAgent.what_hiring_manager_actually_cares_about || 'Not provided'}
- Team dynamics: ${buyerAgent.team_dynamics || 'Not provided'}
- Hidden dealbreakers: ${buyerAgent.hidden_dealbreakers || 'Not provided'}
- Actual remote flexibility: ${buyerAgent.actual_remote_flexibility || 'Not provided'}
- Comp band: $${buyerAgent.comp_band_min?.toLocaleString()} - $${buyerAgent.comp_band_max?.toLocaleString()}

You have full context about both the company and this specific role. Use both layers when assessing candidates.`
}
```

---

## Part 2: Coordinator Agent Route

**`app/api/agents/coordinate/route.ts`**

This is the bilateral dialogue engine. Both the candidate agent and buyer agent engage in a structured conversation before producing a match result.

```typescript
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, jobPostingId, buyerAgentId } = await request.json()

  // Fetch all context
  const [candidateProfile, githubFingerprint, jobPosting, buyerAgent, companyProfile] = 
    await Promise.all([
      supabase.from('candidate_profiles')
        .select('*, profiles(full_name)')
        .eq('user_id', candidateId).single(),
      supabase.from('github_profiles')
        .select('technical_fingerprint, standout_projects')
        .eq('user_id', candidateId).single(),
      supabase.from('job_postings')
        .select('*').eq('id', jobPostingId).single(),
      buyerAgentId ? supabase.from('buyer_agents')
        .select('*, company_profiles(*)').eq('id', buyerAgentId).single() : null,
      null
    ])

  // Build agent system prompts
  const buyerAgentPrompt = buildBuyerAgentPrompt(
    buyerAgent?.data || { 
      company_name: jobPosting.data.company_name,
      role_title: jobPosting.data.title,
      job_description: jobPosting.data.raw_description,
      parsed_requirements: jobPosting.data.parsed_requirements
    },
    buyerAgent?.data?.company_profiles || null
  )

  const candidateAgentPrompt = buildCandidateAgentPrompt(
    candidateProfile.data,
    githubFingerprint.data?.technical_fingerprint
  )

  // -------------------------------------------------------
  // TURN 1: Buyer agent identifies its top qualification questions
  // -------------------------------------------------------
  const buyerQuestionsResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: buyerAgentPrompt,
    messages: [{
      role: 'user',
      content: `You are about to assess a candidate for the ${jobPosting.data?.title} role. 
      Based on your role requirements and company context, what are your top 5 most important 
      qualification questions? These should be the questions where the answer most determines fit.
      Return as a JSON array of strings: ["question1", "question2", ...]`
    }]
  })

  const buyerQuestions = JSON.parse(
    buyerQuestionsResponse.content[0].type === 'text' 
      ? buyerQuestionsResponse.content[0].text 
      : '[]'
  )

  // -------------------------------------------------------
  // TURN 2: Candidate agent responds to each question with evidence
  // -------------------------------------------------------
  const candidateResponsesResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: candidateAgentPrompt,
    messages: [{
      role: 'user',
      content: `You are representing your candidate for a ${jobPosting.data?.title} role at ${jobPosting.data?.company_name}.
      The hiring team has asked these qualification questions:
      ${buyerQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}
      
      Answer each question with specific evidence from the candidate's GitHub work and profile.
      Be honest -- if the candidate doesn't have strong evidence for something, say so.
      Return as JSON: [{"question": "...", "answer": "...", "evidence_source": "github|profile|both|none", "confidence": "high|medium|low"}]`
    }]
  })

  const candidateResponses = JSON.parse(
    candidateResponsesResponse.content[0].type === 'text'
      ? candidateResponsesResponse.content[0].text
      : '[]'
  )

  // -------------------------------------------------------
  // TURN 3: Buyer agent assesses the candidate responses
  // -------------------------------------------------------
  const buyerAssessmentResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: buyerAgentPrompt,
    messages: [
      {
        role: 'user',
        content: `You asked these questions: ${JSON.stringify(buyerQuestions)}`
      },
      {
        role: 'assistant', 
        content: 'I have my qualification questions ready.'
      },
      {
        role: 'user',
        content: `The candidate's agent provided these responses: ${JSON.stringify(candidateResponses)}
        
        Based on these responses and your full role context, provide your assessment.
        Return JSON: {
          "technical_fit_score": 0-100,
          "culture_fit_score": 0-100,
          "question_assessments": [{"question": "...", "satisfied": true|false, "notes": "..."}],
          "buyer_recommendation": "strong_yes|yes|maybe|no",
          "buyer_summary": "2-3 sentences from the hiring team perspective"
        }`
      }
    ]
  })

  const buyerAssessment = JSON.parse(
    buyerAssessmentResponse.content[0].type === 'text'
      ? buyerAssessmentResponse.content[0].text
      : '{}'
  )

  // -------------------------------------------------------
  // TURN 4: Candidate agent assesses the role fit from candidate perspective
  // -------------------------------------------------------
  const candidateAssessmentResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: candidateAgentPrompt,
    messages: [{
      role: 'user',
      content: `Now assess this role from your candidate's perspective.
      Role: ${jobPosting.data?.title} at ${jobPosting.data?.company_name}
      Requirements: ${JSON.stringify(jobPosting.data?.parsed_requirements)}
      Company context: ${JSON.stringify(companyProfile)}
      
      Based on what your candidate is looking for, is this role a good fit FOR THEM?
      Consider: their stated priorities, dealbreakers, culture preferences, comp expectations.
      Return JSON: {
        "role_fit_score": 0-100,
        "candidate_recommendation": "strong_yes|yes|maybe|no",
        "why_candidate_would_want_this": "honest assessment",
        "why_candidate_might_not_want_this": "honest concerns",
        "dealbreaker_triggered": true|false,
        "dealbreaker_detail": "string or null"
      }`
    }]
  })

  const candidateAssessment = JSON.parse(
    candidateAssessmentResponse.content[0].type === 'text'
      ? candidateAssessmentResponse.content[0].text
      : '{}'
  )

  // -------------------------------------------------------
  // TURN 5: Coordinator synthesizes bilateral assessment
  // -------------------------------------------------------
  const coordinatorResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `You are a neutral coordinator synthesizing assessments from both a hiring team's agent and a candidate's agent. 
    Your job is to produce a bilateral match assessment that represents both sides fairly.
    A strong match requires both sides to see value -- not just the hiring team.
    Return ONLY valid JSON.`,
    messages: [{
      role: 'user',
      content: `Synthesize these two agent assessments into a bilateral match result:
      
      BUYER AGENT ASSESSMENT: ${JSON.stringify(buyerAssessment)}
      CANDIDATE AGENT ASSESSMENT: ${JSON.stringify(candidateAssessment)}
      DIALOGUE: ${JSON.stringify({ questions: buyerQuestions, responses: candidateResponses })}
      
      Return JSON:
      {
        "overall_fit_score": 0-100,
        "technical_fit_score": 0-100,
        "role_fit_score": 0-100,
        "bilateral_recommendation": "strong_yes|yes|maybe|no",
        "recommendation_summary": "2-3 sentences for the candidate explaining why their agent surfaced this",
        "hiring_team_summary": "2-3 sentences for the recruiter",
        "bilateral_confidence": "high|medium|low",
        "key_evidence": ["specific evidence points that drove this assessment"],
        "open_questions": ["questions that a human conversation should resolve"],
        "dealbreaker_triggered": true|false,
        "dealbreaker_detail": "string or null",
        "both_sides_interested": true|false
      }`
    }]
  })

  const bilateralAssessment = JSON.parse(
    coordinatorResponse.content[0].type === 'text'
      ? coordinatorResponse.content[0].text
      : '{}'
  )

  // Build full fit report
  const fitReport = {
    ...bilateralAssessment,
    buyer_questions: buyerQuestions,
    candidate_responses: candidateResponses,
    buyer_assessment: buyerAssessment,
    candidate_assessment: candidateAssessment,
    generated_by: 'coordinator_agent',
    agent_turns: 5
  }

  // Save to autonomous_matches
  const { data: match } = await supabase
    .from('autonomous_matches')
    .upsert({
      candidate_id: candidateId,
      job_posting_id: jobPostingId,
      overall_fit_score: bilateralAssessment.overall_fit_score,
      technical_fit_score: bilateralAssessment.technical_fit_score,
      role_fit_score: bilateralAssessment.role_fit_score,
      fit_report: fitReport,
      recommendation: bilateralAssessment.bilateral_recommendation,
      recommendation_summary: bilateralAssessment.recommendation_summary,
      candidate_status: 'pending'
    }, { onConflict: 'candidate_id,job_posting_id' })
    .select()
    .single()

  // Create notification if score is high enough
  const { data: settings } = await supabase
    .from('agent_settings')
    .select('notification_threshold')
    .eq('user_id', candidateId)
    .single()

  const threshold = settings?.notification_threshold || 75

  if (bilateralAssessment.overall_fit_score >= threshold) {
    await supabase.from('notifications').insert({
      user_id: candidateId,
      type: 'strong_match',
      title: `Strong match found: ${jobPosting.data?.title} at ${jobPosting.data?.company_name}`,
      body: bilateralAssessment.recommendation_summary,
      data: { match_id: match?.id, job_posting_id: jobPostingId }
    })
  }

  return NextResponse.json({ match, fitReport })
}

// Candidate agent system prompt
function buildCandidateAgentPrompt(profile: any, githubFingerprint: any): string {
  return `You are the career agent for ${profile?.profiles?.full_name || 'this candidate'}.

Your job is to represent this candidate's interests honestly and specifically.
You advocate for them -- but you are honest about gaps. A bad match wastes their time.

GITHUB TECHNICAL FINGERPRINT (what they have actually built):
${JSON.stringify(githubFingerprint, null, 2)}

SELF-REPORTED PROFILE:
Current title: ${profile?.current_title}
Years of experience: ${profile?.years_of_experience}
Primary languages: ${profile?.primary_languages?.join(', ')}
Systems built: ${JSON.stringify(profile?.systems_built)}
Hardest problems solved: ${JSON.stringify(profile?.hardest_problems)}
Honest strengths: ${profile?.honest_strengths}
Honest gaps: ${profile?.honest_gaps}

WHAT THEY ARE LOOKING FOR:
Remote preference: ${profile?.remote_preference}
Preferred company stage: ${profile?.preferred_company_stage?.join(', ')}
Comp expectation: $${profile?.comp_min?.toLocaleString()} - $${profile?.comp_max?.toLocaleString()}
Visa sponsorship required: ${profile?.visa_sponsorship_required}
Hard dealbreakers: ${profile?.hard_dealbreakers}
What they are optimizing for: ${profile?.next_role_priorities}

When answering questions about this candidate, always cite specific evidence.
Prefer GitHub evidence over self-reported claims when they align.
If GitHub evidence contradicts self-reported claims, flag it honestly.`
}
```

---

## Updated Navigation for Recruiters

Add to recruiter sidebar:
- Dashboard (existing)
- **Companies** (new -- list of company profiles)
- My Roles (existing -- now linked to company profiles)
- Candidate Pool (existing)
- Assessments (existing)

---

## Company Profile List Page

**`app/dashboard/companies/page.tsx`**

Simple list of company profiles the recruiter has created.

Each card shows:
- Company name and stage badge
- Tech stack chips (first 5)
- Completion percentage
- Number of active roles linked to this profile
- Edit button
- "Add role for this company" quick action

Empty state: "Add your first company profile to dramatically improve matching quality across all your roles."

---

## How This Changes the Product Story

The company profile layer means:

Recruiters set up once, benefit forever. Every new role at that company automatically inherits a rich context the buyer agent uses immediately. The tenth role takes 5 minutes to create instead of 30.

Candidates get company-level transparency. Their agent can now assess not just whether they technically fit the role but whether they culturally fit the company. A candidate who hates oncall gets filtered from companies that are honest about heavy oncall expectations.

The bilateral match gets richer. The coordinator agent now has company values data on one side and candidate values data on the other. The match is about fit at every level -- technical, cultural, practical.

This is the data moat. Every company profile filled in is proprietary context that LinkedIn, Greenhouse, and every other tool doesn't have. You own it.

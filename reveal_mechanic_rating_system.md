# Additional Build Instructions: Reveal Mechanic + Rating System

## Overview

This document adds two critical features on top of everything already built:

1. **The reveal mechanic** -- anonymized matching where company and candidate names are hidden until both sides confirm mutual interest
2. **The rating system** -- post-interaction feedback from both sides that builds accountability and trains the matching engine over time

These two features together are what make TalentAgent fundamentally different from every other recruiting tool. Do not skip or simplify either one.

---

## Part 1: The Reveal Mechanic

### Core Concept

Neither side knows who the other is until both have independently confirmed interest based on the match criteria alone. The sequence is:

```
1. Agents assess → bilateral match score produced
2. Both sides see anonymized match summary (no names)
3. Candidate confirms or dismisses
4. Company confirms or dismisses  
5. Only when BOTH confirm → names and contact info revealed
6. Outreach draft generated
7. Human conversation begins
```

This eliminates blind applications, cold outreach, and the awkward dynamic where a candidate applies and never hears back. Every human conversation that happens has already been pre-qualified by both agents AND confirmed by both humans.

---

### Updated Match Status Flow

Update the `autonomous_matches` table to reflect the full status lifecycle:

```sql
-- Update the status check constraint on autonomous_matches
alter table public.autonomous_matches 
  drop constraint if exists autonomous_matches_candidate_status_check;

alter table public.autonomous_matches
  add column match_status text default 'discovered' check (match_status in (
    'discovered',           -- agent found a potential match, not yet assessed
    'assessed',             -- coordinator ran bilateral assessment
    'below_threshold',      -- score too low to surface to either side
    'pending_candidate',    -- surfaced to candidate, awaiting their confirmation
    'candidate_dismissed',  -- candidate said not interested
    'candidate_confirmed',  -- candidate said interested
    'pending_company',      -- surfaced to company side, awaiting their confirmation  
    'company_dismissed',    -- company said not interested
    'company_confirmed',    -- company said interested
    'mutual_confirmed',     -- BOTH sides confirmed -- trigger reveal
    'revealed',             -- names exchanged, contact info shared
    'in_conversation',      -- human conversation has started
    'offer_made',           -- company made an offer
    'hired',                -- candidate accepted
    'closed_no_hire'        -- process ended without hire
  )),
  add column company_confirmation_status text default 'pending' check (
    company_confirmation_status in ('pending', 'confirmed', 'dismissed')
  ),
  add column candidate_confirmation_status text default 'pending' check (
    candidate_confirmation_status in ('pending', 'confirmed', 'dismissed')
  ),
  add column candidate_confirmed_at timestamp with time zone,
  add column company_confirmed_at timestamp with time zone,
  add column revealed_at timestamp with time zone,
  add column recruiter_id uuid references public.profiles(id),
  add column buyer_agent_id uuid references public.buyer_agents(id);

-- Index for efficient status queries
create index autonomous_matches_status_idx on public.autonomous_matches(match_status);
create index autonomous_matches_candidate_idx on public.autonomous_matches(candidate_id, match_status);
create index autonomous_matches_recruiter_idx on public.autonomous_matches(recruiter_id, match_status);
```

---

### Anonymized Views

The key to the reveal mechanic is what each side sees before confirmation.

**What the candidate sees (before reveal):**

```typescript
// Build anonymized company summary for candidate view
export function buildAnonymizedCompanyView(
  jobPosting: any, 
  companyProfile: any, 
  fitReport: any
): object {
  return {
    // Identity -- anonymized
    company_placeholder: generateCompanyAlias(jobPosting.id), // e.g. "Series B Fintech"
    company_size: companyProfile?.company_size || 'Not disclosed',
    company_stage: companyProfile?.company_stage || 'Not disclosed',
    industry: jobPosting.parsed_requirements?.industry || companyProfile?.industry,
    headquarters_region: anonymizeLocation(jobPosting.location), // "San Francisco Bay Area" not "123 Main St"
    remote_type: jobPosting.parsed_requirements?.remote_type,
    
    // Role details -- these are fine to show
    role_title: jobPosting.title,
    comp_range: {
      min: jobPosting.parsed_requirements?.comp_min,
      max: jobPosting.parsed_requirements?.comp_max
    },
    seniority_level: jobPosting.parsed_requirements?.seniority_level,
    tech_stack: jobPosting.parsed_requirements?.tech_stack,
    
    // Culture signals from company profile -- no identifying details
    engineering_culture_summary: companyProfile?.engineering_culture 
      ? summarizeForAnonymity(companyProfile.engineering_culture) 
      : null,
    remote_policy: companyProfile?.remote_policy,
    equity_structure: companyProfile?.equity_structure,
    pto_policy: companyProfile?.pto_policy,
    
    // Match assessment
    overall_fit_score: fitReport.overall_fit_score,
    technical_fit_score: fitReport.technical_fit_score,
    role_fit_score: fitReport.role_fit_score,
    recommendation: fitReport.bilateral_recommendation,
    recommendation_summary: fitReport.recommendation_summary,
    why_you_would_want_this: fitReport.candidate_assessment?.why_candidate_would_want_this,
    why_you_might_not_want_this: fitReport.candidate_assessment?.why_candidate_might_not_want_this,
    green_flags: fitReport.green_flags,
    yellow_flags: fitReport.yellow_flags,
    open_questions: fitReport.open_questions,
    github_evidence: fitReport.github_evidence_highlights
  }
}

// Build anonymized candidate summary for company/recruiter view
export function buildAnonymizedCandidateView(
  candidateProfile: any,
  githubFingerprint: any,
  fitReport: any
): object {
  return {
    // Identity -- anonymized
    candidate_placeholder: generateCandidateAlias(candidateProfile.user_id), // e.g. "Senior Go Engineer"
    
    // Background -- no identifying details
    years_of_experience: candidateProfile.years_of_experience,
    current_seniority: githubFingerprint?.seniority_estimate,
    
    // Technical profile -- safe to show
    primary_languages: candidateProfile.primary_languages,
    frameworks_and_tools: candidateProfile.frameworks_and_tools,
    github_skill_summary: githubFingerprint?.summary,
    standout_projects_anonymized: githubFingerprint?.standout_projects?.map((p: any) => ({
      description: p.description,
      why_notable: p.why_notable,
      technical_depth_score: p.technical_depth_score
      // No repo names or URLs that could identify them
    })),
    
    // Fit signals
    honest_strengths: candidateProfile.honest_strengths,
    honest_gaps: candidateProfile.honest_gaps,
    
    // Requirements -- show so company knows if there are conflicts
    comp_expectation_min: candidateProfile.comp_min,
    comp_expectation_max: candidateProfile.comp_max,
    remote_preference: candidateProfile.remote_preference,
    visa_sponsorship_required: candidateProfile.visa_sponsorship_required,
    available_start: candidateProfile.available_start,
    
    // Match assessment
    overall_fit_score: fitReport.overall_fit_score,
    technical_fit_score: fitReport.technical_fit_score,
    buyer_summary: fitReport.hiring_team_summary,
    buyer_recommendation: fitReport.buyer_assessment?.buyer_recommendation,
    question_assessments: fitReport.buyer_assessment?.question_assessments,
    key_evidence: fitReport.key_evidence,
    open_questions: fitReport.open_questions
  }
}

// Generate a consistent but anonymous alias
function generateCompanyAlias(jobPostingId: string): string {
  // Use the job posting ID to generate a consistent descriptor
  // that doesn't change between page loads but reveals nothing
  const descriptors = [
    'Fast-growing', 'Well-funded', 'Profitable', 
    'Early-stage', 'Series B', 'Public'
  ]
  const industries = [
    'Fintech', 'Dev Tools', 'Infrastructure', 
    'Healthcare Tech', 'Enterprise SaaS', 'AI/ML Platform'
  ]
  // Deterministic but anonymous
  const hash = jobPostingId.charCodeAt(0) + jobPostingId.charCodeAt(1)
  return `${descriptors[hash % descriptors.length]} ${industries[(hash + 3) % industries.length]}`
}

function generateCandidateAlias(userId: string): string {
  const levels = ['Mid-level', 'Senior', 'Staff', 'Principal']
  const hash = userId.charCodeAt(0) + userId.charCodeAt(1)
  return `${levels[hash % levels.length]} Engineer`
}

function anonymizeLocation(location: string): string {
  if (!location) return 'Location not specified'
  // Return region not city
  if (location.toLowerCase().includes('san francisco') || 
      location.toLowerCase().includes('bay area')) return 'San Francisco Bay Area'
  if (location.toLowerCase().includes('new york')) return 'New York Metro'
  if (location.toLowerCase().includes('seattle')) return 'Pacific Northwest'
  if (location.toLowerCase().includes('austin')) return 'Texas'
  if (location.toLowerCase().includes('remote')) return 'Remote'
  return 'United States' // fallback
}
```

---

### New API Routes for Reveal Mechanic

**`app/api/matches/confirm/route.ts`**

Called when either side confirms or dismisses a match.

```typescript
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, action, side } = await request.json()
  // action: 'confirm' | 'dismiss'
  // side: 'candidate' | 'company'

  const { data: match } = await supabase
    .from('autonomous_matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  let updates: any = {}

  if (side === 'candidate') {
    updates.candidate_confirmation_status = action === 'confirm' ? 'confirmed' : 'dismissed'
    updates.candidate_confirmed_at = new Date().toISOString()
    updates.match_status = action === 'confirm' ? 'candidate_confirmed' : 'candidate_dismissed'
  } else if (side === 'company') {
    updates.company_confirmation_status = action === 'confirm' ? 'confirmed' : 'dismissed'
    updates.company_confirmed_at = new Date().toISOString()
    updates.match_status = action === 'confirm' ? 'company_confirmed' : 'company_dismissed'
  }

  // Check for mutual confirmation -- trigger reveal
  const candidateConfirmed = side === 'candidate' 
    ? action === 'confirm' 
    : match.candidate_confirmation_status === 'confirmed'
    
  const companyConfirmed = side === 'company'
    ? action === 'confirm'
    : match.company_confirmation_status === 'confirmed'

  if (candidateConfirmed && companyConfirmed) {
    updates.match_status = 'mutual_confirmed'
    updates.revealed_at = new Date().toISOString()
    
    // Trigger the reveal -- notify both sides
    await triggerReveal(supabase, match, updates)
  }

  await supabase
    .from('autonomous_matches')
    .update(updates)
    .eq('id', matchId)

  return NextResponse.json({ success: true, status: updates.match_status })
}

async function triggerReveal(supabase: any, match: any, updates: any) {
  // Notify candidate -- reveal company name
  await supabase.from('notifications').insert({
    user_id: match.candidate_id,
    type: 'match_revealed',
    title: 'Mutual match confirmed -- company revealed',
    body: 'Both you and the hiring team confirmed interest. Your agent is preparing an introduction.',
    data: { match_id: match.id }
  })

  // Notify recruiter -- reveal candidate name
  await supabase.from('notifications').insert({
    user_id: match.recruiter_id,
    type: 'match_revealed', 
    title: 'Mutual match confirmed -- candidate revealed',
    body: 'Both the candidate and your team confirmed interest. Review their full profile.',
    data: { match_id: match.id }
  })

  // Trigger outreach draft generation
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/outreach/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: match.id })
  })
}
```

**`app/api/matches/[id]/route.ts`**

Returns match data with appropriate anonymization based on who is asking.

```typescript
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user?.id).single()

  const { data: match } = await supabase
    .from('autonomous_matches')
    .select(`
      *,
      job_postings(*),
      candidate_profiles(*, profiles(full_name, email)),
      github_profiles(technical_fingerprint)
    `)
    .eq('id', params.id)
    .single()

  const isRevealed = match.match_status === 'revealed' || 
                     match.match_status === 'in_conversation' ||
                     match.match_status === 'offer_made' ||
                     match.match_status === 'hired'

  if (profile?.role === 'candidate') {
    return NextResponse.json({
      match: {
        id: match.id,
        match_status: match.match_status,
        fit_report: match.fit_report,
        overall_fit_score: match.overall_fit_score,
        candidate_confirmation_status: match.candidate_confirmation_status,
        company_confirmation_status: match.company_confirmation_status,
        // Show company details only after reveal
        company: isRevealed 
          ? {
              name: match.job_postings.company_name,
              website: match.job_postings.company_website,
              role_title: match.job_postings.title
            }
          : buildAnonymizedCompanyView(
              match.job_postings, 
              null, 
              match.fit_report
            )
      }
    })
  }

  if (profile?.role === 'recruiter') {
    return NextResponse.json({
      match: {
        id: match.id,
        match_status: match.match_status,
        fit_report: match.fit_report,
        overall_fit_score: match.overall_fit_score,
        candidate_confirmation_status: match.candidate_confirmation_status,
        company_confirmation_status: match.company_confirmation_status,
        // Show candidate details only after reveal
        candidate: isRevealed
          ? {
              name: match.candidate_profiles.profiles.full_name,
              email: match.candidate_profiles.profiles.email,
              profile: match.candidate_profiles,
              github: match.github_profiles
            }
          : buildAnonymizedCandidateView(
              match.candidate_profiles,
              match.github_profiles?.technical_fingerprint,
              match.fit_report
            )
      }
    })
  }
}
```

---

### UI: Candidate Opportunities Feed (Updated)

Each match card now has three states:

**State 1: Pending (candidate hasn't acted)**

Show anonymized company view. Card has two prominent buttons:

"I'm interested" button (green) -- calls confirm API with side=candidate
"Not for me" button (ghost) -- calls confirm API with action=dismiss

Below the buttons show: "If you confirm and the hiring team also confirms, you'll both be introduced."

**State 2: Candidate confirmed, waiting on company**

Show a "Waiting for hiring team response" badge.
Subtle animation -- pulsing dot.
Message: "Your agent has notified the hiring team. We'll let you know when they respond."
Still show anonymized company view.

**State 3: Mutual confirmed -- reveal moment**

This should feel like a meaningful moment in the UI. Not just a status update.

Show a subtle animation -- the anonymized placeholder fades out and the real company name fades in.

Display:
- Company logo (from Clearbit)
- Company name (real)
- Recruiter name and email
- "Your agent has drafted an introduction email. Review it before it sends."
- Link to outreach draft review

**State 4: Dismissed (either side)**

Collapse the card. Show a small "Not a match" label.
Give candidate the option to see why: "See what didn't align"
This builds trust -- candidates learn from dismissals.

---

### UI: Recruiter Match Queue (New Page)

**`app/dashboard/matches/page.tsx`**

Replaces the old assessments view. Now shows the full bilateral match pipeline.

Four columns (Kanban style):

**Pending Review** -- matches above threshold that recruiter hasn't confirmed or dismissed yet
Shows anonymized candidate view. Confirm / Dismiss buttons.

**Waiting on Candidate** -- recruiter confirmed, candidate hasn't responded
Shows how long they've been waiting. Option to withdraw confirmation.

**Mutual Confirmed** -- both sides confirmed, reveal happened
Shows full candidate details. Link to outreach draft. "Move to In Conversation" button.

**In Conversation** -- active human process
Shows candidate name, last activity, rating prompt if conversation has concluded.

---

## Part 2: Rating System

### New Database Table

```sql
create table public.match_ratings (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.autonomous_matches(id) on delete cascade not null,
  rater_id uuid references public.profiles(id) not null,
  rater_role text not null check (rater_role in ('candidate', 'recruiter')),
  
  -- When ratings are submitted
  rating_stage text not null check (rating_stage in (
    'post_reveal',        -- immediately after reveal (was the anonymized summary accurate?)
    'post_conversation',  -- after first human conversation
    'post_process'        -- after full process concludes (hire or no hire)
  )),
  
  -- Core ratings (1-5)
  overall_match_quality integer check (overall_match_quality between 1 and 5),
  assessment_accuracy integer check (assessment_accuracy between 1 and 5),
  -- "How accurately did the fit report describe the other side?"
  
  -- Role-specific ratings
  -- For candidates rating companies:
  company_culture_accuracy integer check (company_culture_accuracy between 1 and 5),
  -- "Did the company match how they described themselves?"
  role_accuracy integer check (role_accuracy between 1 and 5),
  -- "Did the role match the job description and hidden context?"
  
  -- For recruiters rating candidates:
  skills_accuracy integer check (skills_accuracy between 1 and 5),
  -- "Did the candidate's actual skills match the assessment?"
  github_evidence_accuracy integer check (github_evidence_accuracy between 1 and 5),
  -- "Did the GitHub evidence accurately represent their capability?"
  profile_honesty integer check (profile_honesty between 1 and 5),
  -- "Did the candidate represent themselves honestly?"
  
  -- Qualitative
  what_was_accurate text,
  what_was_inaccurate text,
  would_use_again boolean,
  
  -- Outcome (filled in at post_process stage)
  outcome text check (outcome in ('hired', 'candidate_withdrew', 'company_withdrew', 'mutual_no_fit', 'offer_declined', 'still_in_process')),
  outcome_notes text,
  
  -- Private -- never shown to the other party individually
  -- Only aggregated scores become visible after threshold
  is_private boolean default true,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(match_id, rater_id, rating_stage)
);

-- Aggregated trust scores (computed from ratings, visible to both sides)
create table public.trust_scores (
  id uuid default gen_random_uuid() primary key,
  entity_id uuid not null, -- either a user_id or a company_profile_id
  entity_type text not null check (entity_type in ('candidate', 'company')),
  
  -- Aggregated scores
  overall_score numeric(3,2), -- 1.00-5.00
  assessment_accuracy_score numeric(3,2),
  
  -- Candidate-specific aggregates
  skills_accuracy_score numeric(3,2),
  profile_honesty_score numeric(3,2),
  
  -- Company-specific aggregates
  culture_accuracy_score numeric(3,2),
  role_accuracy_score numeric(3,2),
  
  -- Metadata
  total_ratings integer default 0,
  ratings_threshold_met boolean default false, -- true when >= 5 ratings received
  last_calculated_at timestamp with time zone,
  
  unique(entity_id, entity_type),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.match_ratings enable row level security;
alter table public.trust_scores enable row level security;

-- Raters can manage their own ratings
create policy "Users manage own ratings" on public.match_ratings 
  for all using (auth.uid() = rater_id);

-- Trust scores are publicly readable (once threshold met)
create policy "Trust scores publicly readable" on public.trust_scores 
  for select using (ratings_threshold_met = true);

-- Service role can manage trust scores
create policy "Service role manages trust scores" on public.trust_scores 
  for all using (auth.role() = 'service_role');
```

---

### Rating API Routes

**`app/api/ratings/submit/route.ts`**

```typescript
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { matchId, ratingStage, ratings, qualitative, outcome } = await request.json()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  // Save the rating
  await supabase.from('match_ratings').upsert({
    match_id: matchId,
    rater_id: user.id,
    rater_role: profile?.role,
    rating_stage: ratingStage,
    ...ratings,
    ...qualitative,
    outcome,
    is_private: true
  }, { onConflict: 'match_id,rater_id,rating_stage' })

  // Recalculate trust scores
  await recalculateTrustScore(supabase, matchId, profile?.role)

  return NextResponse.json({ success: true })
}

async function recalculateTrustScore(supabase: any, matchId: string, raterRole: string) {
  const { data: match } = await supabase
    .from('autonomous_matches')
    .select('candidate_id, recruiter_id, job_postings(company_name)')
    .eq('id', matchId)
    .single()

  // Determine which entity to update
  const entityId = raterRole === 'recruiter' 
    ? match.candidate_id  // recruiter rated candidate
    : match.recruiter_id  // candidate rated company

  const entityType = raterRole === 'recruiter' ? 'candidate' : 'company'

  // Get all ratings for this entity
  const { data: ratings } = await supabase
    .from('match_ratings')
    .select('*')
    .eq('rater_role', raterRole === 'recruiter' ? 'recruiter' : 'candidate')

  if (!ratings || ratings.length === 0) return

  // Calculate aggregates
  const avg = (field: string) => {
    const values = ratings.filter((r: any) => r[field]).map((r: any) => r[field])
    return values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null
  }

  const trustScore = {
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
    last_calculated_at: new Date().toISOString()
  }

  await supabase.from('trust_scores').upsert(trustScore, { onConflict: 'entity_id,entity_type' })
}
```

---

### Rating UI Components

**Post-reveal rating prompt (shown immediately after reveal)**

Triggered when match status changes to 'revealed'. Show as a card at the top of the match detail.

For candidate:
```
"Before your conversation with [Company Name] -- was our anonymized summary accurate?"

How accurately did we describe this company? ⭐⭐⭐⭐⭐
How accurately did we describe the role?      ⭐⭐⭐⭐⭐

What was most accurate? [text]
What surprised you?     [text]

[Submit] -- takes 30 seconds, helps us improve
```

For recruiter:
```
"Before your conversation with this candidate -- was our assessment accurate?"

How accurately did we assess their technical skills? ⭐⭐⭐⭐⭐
Did the GitHub evidence reflect their actual ability? ⭐⭐⭐⭐⭐

What matched your expectations? [text]
What was different?             [text]

[Submit]
```

**Post-conversation rating prompt (shown 48 hours after reveal)**

Send a notification: "How did the conversation go? Your feedback improves matching for everyone."

Both sides rate:
- Overall match quality (1-5)
- Would you have wanted this introduction without TalentAgent? (yes/no)
- Free text: what should the agent have known?

**Post-process rating (shown when match is marked closed)**

Recruiter marks outcome (hired / withdrew / no fit).
Both sides get a final rating prompt with the full outcome context.
This is the most valuable rating -- it closes the feedback loop on whether the prediction was right.

---

### Trust Score Display

Show trust scores in the anonymized match views once threshold is met (5+ ratings).

**In candidate's opportunity feed (for each anonymized company):**
```
Company trust score: ★★★★☆ 4.2 (based on 8 candidate reviews)
"Accurately represents culture" -- most common feedback
```

**In recruiter's match queue (for each anonymized candidate):**
```
Candidate trust score: ★★★★★ 4.8 (based on 6 recruiter reviews)
"Skills matched assessment" -- most common feedback
```

Show this prominently. It's a signal to both sides that the platform enforces honesty and that misrepresentation has consequences.

---

### How Ratings Feed Back Into Matching

Add a calibration layer to the coordinator prompt based on trust scores:

```typescript
export function buildCoordinatorPromptWithCalibration(
  candidateTrustScore: any,
  companyTrustScore: any
): string {
  const candidateCalibration = candidateTrustScore?.ratings_threshold_met
    ? `Note: This candidate has a profile honesty score of ${candidateTrustScore.profile_honesty_score?.toFixed(1)}/5.0 
       based on ${candidateTrustScore.total_ratings} recruiter ratings. 
       ${candidateTrustScore.profile_honesty_score < 3.5 
         ? 'Weight self-reported claims less heavily -- GitHub evidence should dominate.' 
         : 'Self-reported claims appear reliable based on historical ratings.'}`
    : 'No rating history yet -- weight GitHub evidence more heavily than self-reported claims.'

  const companyCalibration = companyTrustScore?.ratings_threshold_met
    ? `Note: This company has a culture accuracy score of ${companyTrustScore.culture_accuracy_score?.toFixed(1)}/5.0
       based on ${companyTrustScore.total_ratings} candidate ratings.
       ${companyTrustScore.culture_accuracy_score < 3.5
         ? 'Candidates have found this company misrepresents culture. Flag this risk in your assessment.'
         : 'Company has a strong track record of accurately representing their culture.'}`
    : 'No rating history for this company yet.'

  return `
${candidateCalibration}

${companyCalibration}

Apply these calibration signals when weighting evidence and setting confidence levels.
`
}
```

---

## Updated Build Order

Add these to the end of the existing build sequence:

1. Run the new SQL (match status updates, match_ratings, trust_scores tables)
2. Build the anonymization utility functions in `lib/utils/anonymize.ts`
3. Build the confirm API route
4. Build the match detail API route with role-based anonymization
5. Update the opportunities feed to show the three card states
6. Build the recruiter match queue page (Kanban)
7. Build the rating submission API route
8. Build the trust score recalculation logic
9. Build the rating UI components (post-reveal, post-conversation, post-process)
10. Add trust score display to anonymized match cards
11. Update the coordinator prompt to include calibration signals
12. Test the full reveal flow end to end:
    - Candidate sees anonymized match → confirms
    - Recruiter sees anonymized candidate → confirms
    - Both confirmed → reveal triggers → both get notifications with real names
    - Both get post-reveal rating prompts

---

## The Full Product Flow (Complete Picture)

```
SETUP PHASE (one time)
├── Recruiter creates company profile (15 min)
├── Recruiter creates buyer agent per role (5 min each)
└── Candidate connects GitHub + builds rich profile (30 min)

AUTONOMOUS PHASE (no humans involved)
├── Crawler ingests job postings every 6 hours
├── Matching engine runs every 2 hours
├── Coordinator agent runs bilateral 5-turn dialogue
├── Matches below threshold → silently discarded
└── Matches above threshold → enter pending_candidate state

CONFIRMATION PHASE (light human touch)
├── Candidate sees anonymized match card
├── Candidate confirms or dismisses (30 seconds)
├── If confirmed → company side notified
├── Recruiter sees anonymized candidate card
├── Recruiter confirms or dismisses (30 seconds)
└── If both confirm → reveal triggers

REVEAL MOMENT
├── Both sides notified simultaneously
├── Company name revealed to candidate
├── Candidate name + profile revealed to recruiter
├── Outreach email drafted by candidate agent
├── Both sides submit post-reveal ratings
└── Human conversation begins

HUMAN PHASE
├── Candidate reviews and approves outreach email
├── Recruiter receives introduction
├── Interview process follows normal path
└── Both sides rate post-conversation and post-process

FEEDBACK LOOP
├── Ratings update trust scores
├── Trust scores displayed in future anonymized views
├── Coordinator prompt calibrated by trust scores
└── Matching gets smarter with every completed interaction
```

This is the complete product. Every feature serves the core thesis:
agents do the work, humans confirm the fit, trust is enforced by ratings,
and the system gets smarter with every match.

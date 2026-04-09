# Claude Code Build Instructions: LinkedIn Integration + GitHub Cross-Reference

## Overview

Build a LinkedIn data ingestion layer that accepts profile data via text paste or PDF upload, parses it with Claude, stores structured employment history, and cross-references it against GitHub commit history to produce consistency scores and signals.

This adds significant trust to the candidate profile. Recruiters can see not just what candidates claim but whether their GitHub activity corroborates those claims.

Do not modify any existing working code. Add all new functionality on top of what already exists.

---

## New Database Tables

Run this SQL in Supabase SQL editor:

```sql
-- LinkedIn profile data
create table public.linkedin_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  
  -- Raw input
  input_method text check (input_method in ('text_paste', 'pdf_upload')),
  raw_text text,
  pdf_url text,
  
  -- Parsed structured data
  headline text,
  summary text,
  location text,
  connections_count integer,
  
  -- Employment history
  positions jsonb default '[]',
  -- Array of:
  -- {
  --   company: string,
  --   title: string,
  --   start_month: integer (1-12 or null),
  --   start_year: integer,
  --   end_month: integer (1-12 or null),
  --   end_year: integer or null (null = current),
  --   is_current: boolean,
  --   duration_months: integer,
  --   description: string,
  --   location: string
  -- }
  
  -- Education
  education jsonb default '[]',
  -- Array of:
  -- {
  --   institution: string,
  --   degree: string,
  --   field: string,
  --   start_year: integer,
  --   end_year: integer,
  --   activities: string
  -- }
  
  -- Skills and endorsements
  skills jsonb default '[]',
  -- Array of: {skill: string, endorsement_count: integer}
  
  -- Certifications
  certifications jsonb default '[]',
  -- Array of: {name: string, issuer: string, date: string}
  
  -- Computed fields
  total_experience_years numeric(4,1),
  career_trajectory text, -- 'upward' | 'lateral' | 'mixed' | 'unclear'
  average_tenure_months numeric(5,1),
  notable_companies text[], -- well-known companies from employment history
  
  -- Processing status
  parse_status text default 'pending' check (parse_status in ('pending', 'parsing', 'complete', 'failed')),
  parsed_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cross-reference analysis between LinkedIn and GitHub
create table public.profile_cross_references (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  
  -- Overall consistency score
  consistency_score integer check (consistency_score between 0 and 100),
  consistency_rating text check (consistency_rating in ('strong', 'good', 'mixed', 'weak', 'insufficient_data')),
  
  -- Timeline cross-reference
  timeline_analysis jsonb default '[]',
  -- Array of:
  -- {
  --   period: string (e.g. "Jan 2022 - Mar 2024"),
  --   linkedin_claim: string (what they claimed to be doing),
  --   github_evidence: string (what GitHub shows during this period),
  --   consistency: 'corroborated' | 'neutral' | 'gap' | 'conflict',
  --   confidence: 'high' | 'medium' | 'low',
  --   notes: string
  -- }
  
  -- Skill cross-reference
  skill_analysis jsonb default '[]',
  -- Array of:
  -- {
  --   skill: string,
  --   linkedin_claimed: boolean,
  --   github_evidence: string or null,
  --   evidence_strength: 'strong' | 'moderate' | 'weak' | 'none',
  --   repos_cited: [string]
  -- }
  
  -- Seniority cross-reference
  seniority_consistency jsonb default '{}',
  -- {
  --   linkedin_implied_seniority: string,
  --   github_implied_seniority: string,
  --   consistent: boolean,
  --   notes: string
  -- }
  
  -- Flags
  corroboration_highlights jsonb default '[]', -- strong positive signals
  consistency_flags jsonb default '[]', -- things to probe in human conversation
  red_flags jsonb default '[]', -- genuine concerns
  
  -- Summary for recruiters
  cross_reference_summary text,
  questions_to_ask jsonb default '[]', -- suggested questions based on inconsistencies
  
  analyzed_at timestamp with time zone,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.linkedin_profiles enable row level security;
alter table public.profile_cross_references enable row level security;

create policy "Users manage own linkedin profile" on public.linkedin_profiles 
  for all using (auth.uid() = user_id);

create policy "Recruiters can view linkedin profiles" on public.linkedin_profiles 
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'recruiter')
  );

create policy "Users manage own cross references" on public.profile_cross_references 
  for all using (auth.uid() = user_id);

create policy "Recruiters can view cross references" on public.profile_cross_references 
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'recruiter')
  );

create trigger handle_linkedin_profiles_updated_at before update on public.linkedin_profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_cross_references_updated_at before update on public.profile_cross_references
  for each row execute procedure public.handle_updated_at();
```

---

## New API Routes

### `app/api/linkedin/parse/route.ts`

Accepts text paste or PDF upload, parses with Claude, saves structured data, then triggers cross-reference analysis.

```typescript
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const method = formData.get('method') as string // 'text_paste' or 'pdf_upload'
  const textContent = formData.get('text') as string
  const pdfFile = formData.get('pdf') as File | null

  let rawText = textContent

  // Handle PDF upload
  if (method === 'pdf_upload' && pdfFile) {
    // Convert PDF to base64 and send to Claude for extraction
    const pdfBytes = await pdfFile.arrayBuffer()
    const base64Pdf = Buffer.from(pdfBytes).toString('base64')

    const pdfExtraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf
            }
          },
          {
            type: 'text',
            text: 'Extract all text from this LinkedIn profile PDF. Return the raw text content preserving the structure as much as possible. Include all sections: headline, summary, experience, education, skills, certifications, and any other sections present.'
          }
        ]
      }]
    })

    rawText = pdfExtraction.content[0].type === 'text' ? pdfExtraction.content[0].text : ''

    // Save PDF to Supabase storage
    if (pdfFile) {
      const { data: uploadData } = await supabase.storage
        .from('linkedin-pdfs')
        .upload(`${user.id}/profile.pdf`, pdfFile, { upsert: true })
    }
  }

  if (!rawText || rawText.length < 100) {
    return NextResponse.json({ error: 'Insufficient LinkedIn data provided' }, { status: 400 })
  }

  // Update status to parsing
  await supabase.from('linkedin_profiles').upsert({
    user_id: user.id,
    input_method: method,
    raw_text: rawText,
    parse_status: 'parsing'
  }, { onConflict: 'user_id' })

  // Parse with Claude
  const parseResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Parse this LinkedIn profile text and extract structured data. Be precise with dates -- if a month is not specified use null for the month field. For current positions set end_year and end_month to null and is_current to true.

LinkedIn Profile Text:
${rawText.substring(0, 8000)}

Return ONLY valid JSON:
{
  "headline": "string or null",
  "summary": "string or null",
  "location": "string or null",
  "connections_count": integer or null,
  "positions": [
    {
      "company": "string",
      "title": "string",
      "start_month": integer or null,
      "start_year": integer,
      "end_month": integer or null,
      "end_year": integer or null,
      "is_current": boolean,
      "duration_months": integer,
      "description": "string or null",
      "location": "string or null"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string or null",
      "field": "string or null",
      "start_year": integer or null,
      "end_year": integer or null,
      "activities": "string or null"
    }
  ],
  "skills": [
    {
      "skill": "string",
      "endorsement_count": integer or 0
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string or null",
      "date": "string or null"
    }
  ],
  "total_experience_years": number,
  "career_trajectory": "upward|lateral|mixed|unclear",
  "average_tenure_months": number,
  "notable_companies": ["string"]
}`
    }]
  })

  const parseText = parseResult.content[0].type === 'text' ? parseResult.content[0].text : '{}'
  let parsed: any = {}
  
  try {
    parsed = JSON.parse(parseText)
  } catch {
    return NextResponse.json({ error: 'Failed to parse LinkedIn data' }, { status: 500 })
  }

  // Save parsed data
  await supabase.from('linkedin_profiles').update({
    ...parsed,
    parse_status: 'complete',
    parsed_at: new Date().toISOString()
  }).eq('user_id', user.id)

  // Trigger cross-reference analysis
  await runCrossReferenceAnalysis(supabase, user.id, parsed)

  // Update onboarding progress
  await supabase.from('onboarding_sessions').upsert({
    user_id: user.id,
    last_active_step: 'linkedin_added'
  }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true, parsed })
}

async function runCrossReferenceAnalysis(supabase: any, userId: string, linkedinData: any) {
  // Get GitHub fingerprint
  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('technical_fingerprint, repos_analyzed, github_username')
    .eq('user_id', userId)
    .single()

  if (!githubProfile?.technical_fingerprint) return // Can not cross-reference without GitHub

  const fingerprint = githubProfile.technical_fingerprint
  const repos = githubProfile.repos_analyzed || []

  const crossRefPrompt = `You are analyzing the consistency between a software engineer's LinkedIn employment history and their GitHub activity. Your goal is to surface genuine corroboration, neutral gaps, and potential inconsistencies that a technical recruiter should be aware of.

Be fair and charitable. Many engineers have private repos, work on internal codebases, or contribute to code that is not visible on GitHub. Absence of GitHub evidence during a period is NOT necessarily a red flag -- it is just neutral. Only flag things that are genuinely inconsistent or surprising.

LINKEDIN EMPLOYMENT HISTORY:
${JSON.stringify(linkedinData.positions, null, 2)}

LINKEDIN SKILLS CLAIMED:
${linkedinData.skills?.map((s: any) => s.skill).join(', ')}

GITHUB TECHNICAL FINGERPRINT:
Primary Languages: ${fingerprint.primary_languages?.map((l: any) => `${l.language} (${l.estimated_proficiency})`).join(', ')}
Frameworks: ${fingerprint.frameworks_detected?.map((f: any) => f.name).join(', ')}
Seniority Estimate: ${fingerprint.seniority_estimate}
Skill Trajectory: ${fingerprint.skill_trajectory?.direction}
Notable Recent Work: ${fingerprint.skill_trajectory?.notable_recent_work}
Overall GitHub Strength: ${fingerprint.overall_github_strength}/10

STANDOUT GITHUB PROJECTS:
${fingerprint.standout_projects?.map((p: any) => `- ${p.name}: ${p.description}`).join('\n')}

HONEST GITHUB GAPS:
${fingerprint.honest_gaps?.join(', ')}

Analyze the consistency between these two data sources and return ONLY valid JSON:

{
  "consistency_score": <integer 0-100, where 100 is perfectly consistent>,
  "consistency_rating": "<strong|good|mixed|weak|insufficient_data>",
  "timeline_analysis": [
    {
      "period": "<date range string>",
      "linkedin_claim": "<what they claimed to be doing>",
      "github_evidence": "<what GitHub shows during this period or 'No public GitHub activity detected'>",
      "consistency": "<corroborated|neutral|gap|conflict>",
      "confidence": "<high|medium|low>",
      "notes": "<specific observation>"
    }
  ],
  "skill_analysis": [
    {
      "skill": "<skill name>",
      "linkedin_claimed": true,
      "github_evidence": "<specific evidence or null>",
      "evidence_strength": "<strong|moderate|weak|none>",
      "repos_cited": ["<repo names>"]
    }
  ],
  "seniority_consistency": {
    "linkedin_implied_seniority": "<what their titles suggest>",
    "github_implied_seniority": "<what GitHub suggests>",
    "consistent": <boolean>,
    "notes": "<string>"
  },
  "corroboration_highlights": [
    "<specific positive signal where GitHub strongly corroborates LinkedIn claim>"
  ],
  "consistency_flags": [
    "<something worth probing in a human conversation -- not necessarily a red flag, just a gap or question>"
  ],
  "red_flags": [
    "<genuine concern where LinkedIn claim is directly contradicted by GitHub evidence>"
  ],
  "cross_reference_summary": "<3-4 sentence summary for recruiters explaining the overall consistency picture>",
  "questions_to_ask": [
    "<specific question to ask in human screen based on what you found>"
  ]
}`

  const crossRefResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: crossRefPrompt }]
  })

  const crossRefText = crossRefResult.content[0].type === 'text' ? crossRefResult.content[0].text : '{}'
  
  try {
    const crossRef = JSON.parse(crossRefText)
    
    await supabase.from('profile_cross_references').upsert({
      user_id: userId,
      ...crossRef,
      analyzed_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

  } catch (err) {
    console.error('Cross-reference analysis failed:', err)
  }
}
```

### `app/api/linkedin/status/route.ts`

Returns current LinkedIn parse status:

```typescript
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: linkedin } = await supabase
    .from('linkedin_profiles')
    .select('parse_status, headline, total_experience_years, parsed_at')
    .eq('user_id', user.id)
    .single()

  const { data: crossRef } = await supabase
    .from('profile_cross_references')
    .select('consistency_score, consistency_rating, analyzed_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ linkedin, crossRef })
}
```

---

## New Pages to Build

### LinkedIn Integration Page (`app/dashboard/linkedin/page.tsx`)

Add to candidate sidebar navigation between GitHub and Agent Settings.

**If LinkedIn not yet connected:**

Show two options side by side:

Option 1 -- Text Paste card:
- Headline: "Paste your LinkedIn profile"
- Instructions: "Go to your LinkedIn profile → right click → Select All → Copy → Paste below"
- Large textarea for pasting
- "Analyze Profile" button

Option 2 -- PDF Upload card:
- Headline: "Upload your LinkedIn PDF"
- Instructions: "LinkedIn → Me → Settings & Privacy → Data Privacy → Get a copy of your data → Download profile as PDF"
- File upload dropzone that accepts PDF only
- "Upload and Analyze" button

Privacy callout below both options:
- "Your LinkedIn data is only used to build your agent profile and cross-reference with your GitHub"
- "We never contact anyone from your LinkedIn network"
- "Delete your LinkedIn data at any time from settings"

**While parsing (show progress):**

Animated progress indicator with messages:
- "Reading your employment history..."
- "Extracting skills and experience..."
- "Cross-referencing with your GitHub..."
- "Building consistency analysis..."

**After parsing is complete:**

Show four sections:

**Employment Timeline card**
Visual timeline of their career. Each position shows:
- Company name and title
- Date range and duration
- A consistency badge next to each role: Corroborated / Neutral / Review
- Click to expand and see the specific GitHub evidence or notes

**Skills Verification card**
Grid of their LinkedIn skills. Each skill shows:
- Skill name
- Evidence strength badge: GitHub Verified / Partial Evidence / Unverified
- On hover or click: show specific repos that provide evidence

**Consistency Score card**
Large circular score (0-100) with color coding:
- 85-100: Strong (green)
- 70-84: Good (blue)
- 50-69: Mixed (amber)
- Below 50: Weak (red)

Below the score: the cross_reference_summary in plain text.

**Flags and Highlights card**
Three sections:
- Green section: Corroboration highlights (GitHub strongly supports LinkedIn claims)
- Yellow section: Consistency flags (worth discussing in a human conversation)
- Red section: Red flags if any (genuine concerns)

Below flags: "Questions your agent suggests asking employers" -- this flips the script. These are questions the candidate should ask the employer to verify mutual fit.

---

### Updated GitHub Page (`app/dashboard/github/page.tsx`)

Add a "LinkedIn Cross-Reference" section at the bottom of the existing GitHub fingerprint display. Show:

- Consistency score badge
- One line summary
- Link to full LinkedIn analysis: "View full cross-reference →"

This creates a natural discovery path -- candidates see the cross-reference teaser on the GitHub page and click through to the LinkedIn page.

---

### Updated Candidate Profile for Recruiters

When recruiters view an anonymized or revealed candidate profile add a new section: "Profile Verification"

Show:
- GitHub strength score (already exists)
- LinkedIn consistency score (new)
- Combined verification score (average of both)
- A single plain-English sentence: "GitHub activity strongly corroborates LinkedIn employment history" or "Some gaps between LinkedIn claims and GitHub activity -- suggested questions included"

For revealed candidates show the full cross-reference including suggested questions. This gives recruiters a starting point for the human conversation that is grounded in evidence rather than gut feel.

---

## Supabase Storage Setup

Run this SQL to create the storage bucket for LinkedIn PDFs:

```sql
insert into storage.buckets (id, name, public) values ('linkedin-pdfs', 'linkedin-pdfs', false);

create policy "Users upload own linkedin pdf" on storage.objects 
  for insert with check (
    bucket_id = 'linkedin-pdfs' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own linkedin pdf" on storage.objects 
  for select using (
    bucket_id = 'linkedin-pdfs' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Navigation Updates

Add "LinkedIn" to the candidate sidebar between "GitHub" and "Agent Settings".

Show a status indicator next to the nav item:
- Gray dot: Not connected
- Amber dot: Parsing
- Green dot: Connected and analyzed
- Show the consistency score as a small badge if available: "LinkedIn ✓ 87"

---

## How Cross-Reference Data Is Used in Matching

Update the candidate agent prompt to include cross-reference signals:

In `lib/anthropic/prompts.ts` add to the candidate agent context:

```typescript
// Add after GitHub fingerprint section
const crossRefSection = crossReference ? `
LINKEDIN CROSS-REFERENCE ANALYSIS:
Consistency Score: ${crossReference.consistency_score}/100
Consistency Rating: ${crossReference.consistency_rating}
Summary: ${crossReference.cross_reference_summary}

Corroboration Highlights (use these as strong evidence):
${crossReference.corroboration_highlights?.join('\n') || 'None'}

Consistency Flags (be transparent about these):
${crossReference.consistency_flags?.join('\n') || 'None'}

Red Flags (disclose if directly relevant to a requirement):
${crossReference.red_flags?.join('\n') || 'None'}

IMPORTANT: When answering questions about the candidate's experience, prioritize claims that are corroborated by both LinkedIn AND GitHub. Flag claims that are only on LinkedIn without GitHub evidence as "LinkedIn-reported, not yet GitHub-verified." Never hide red flags -- transparency builds trust.
` : 'LinkedIn cross-reference not yet available for this candidate.'
```

---

## Build Order

1. Run the new SQL (linkedin_profiles and profile_cross_references tables)
2. Create the Supabase storage bucket for LinkedIn PDFs
3. Build `app/api/linkedin/parse/route.ts`
4. Build `app/api/linkedin/status/route.ts`
5. Build `app/dashboard/linkedin/page.tsx` with all three states (empty, parsing, complete)
6. Update `app/dashboard/github/page.tsx` to add the LinkedIn cross-reference teaser section
7. Update the candidate agent prompt in `lib/anthropic/prompts.ts` to include cross-reference data
8. Update the recruiter-facing candidate profile to show the verification section
9. Add LinkedIn to the candidate sidebar navigation with status indicator
10. Test end to end with a real LinkedIn paste

---

## Testing the Cross-Reference

To test without a real LinkedIn profile paste this sample text into the LinkedIn text box:

```
John Smith
Senior Software Engineer at Acme Corp
San Francisco Bay Area · 500+ connections

About
Experienced software engineer specializing in distributed systems and Go.

Experience

Senior Software Engineer
Acme Corp · Full-time
Jan 2022 - Present · 2 yrs 3 mos
San Francisco, CA
Leading backend infrastructure team. Built distributed job processing system handling 10M events per day. Migrated monolith to microservices.

Software Engineer
StartupXYZ · Full-time  
Mar 2019 - Dec 2021 · 2 yrs 10 mos
Remote
Full stack development with React and Node.js. Led frontend rebuild.

Skills
Go · Kubernetes · Distributed Systems · React · Node.js · PostgreSQL · AWS
```

The cross-reference engine should compare this against the candidate's GitHub fingerprint and produce a meaningful consistency analysis.

---

## What Success Looks Like

A recruiter looking at a revealed candidate profile sees:

"GitHub activity strongly corroborates this candidate's LinkedIn history. Their Go expertise is verified by 8 repositories with production-level complexity. The distributed systems work at Acme Corp aligns with a significant increase in infrastructure-related commits starting January 2022. LinkedIn consistency score: 91/100."

That sentence replaces a 45-minute reference check conversation. That is the value.

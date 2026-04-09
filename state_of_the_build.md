# TalentAgent — State of the Build
**Last updated: April 2026**
**For use as context in new AI conversations**

---

## What TalentAgent Is

A two-sided recruiting marketplace where AI agents represent both candidates and employers. The core mechanic: both sides are anonymous to each other until both independently confirm mutual interest. Only then are names revealed.

**The one sentence pitch**: Recruiting that reads between the lines -- candidates build rich profiles beyond a resume, recruiters create buyer agents with hidden context, and Claude produces structured fit assessments that surface what actually matters.

**Live at**: https://usetalentagent.com

**GitHub repo**: https://github.com/jjacobovitz-collab/talentagent (public)

**Cofounders**: Jared Jacobovitz (sales/product) and Tim Sedlak (enterprise sales, Stardog)

---

## The Core Product Flow

```
CANDIDATE SIDE:
1. Signs up as candidate
2. Connects GitHub → agent ingests repos and builds technical fingerprint
3. Adds LinkedIn data (text paste or PDF) → cross-referenced against GitHub
4. Fills out rich profile: systems built, hardest problems, honest gaps, preferences, comp, dealbreakers
5. Agent works autonomously matching them against open roles 24/7

EMPLOYER SIDE:
1. Signs up as recruiter
2. Creates company profile (manually OR by uploading documents -- culture deck, engineering handbook, etc)
3. Creates buyer agent by pasting a JD → Claude auto-extracts all fields + asks 3 targeted follow-up questions
4. Agent goes to market against candidate pool automatically

MATCHING:
1. Coordinator agent runs 5-turn bilateral dialogue between candidate agent and buyer agent
2. Both agents score the match from their principal's perspective
3. Matches above threshold surface to both sides -- ANONYMIZED
4. Candidate sees: role details, culture signals, fit score -- NO company name
5. Recruiter sees: technical profile, GitHub evidence, fit score -- NO candidate name
6. Each side independently confirms or dismisses
7. ONLY when both confirm → reveal triggers → names exchanged
8. Candidate agent drafts introduction email for candidate to approve
9. Both sides rate the match post-reveal and post-conversation
10. Ratings build trust scores that improve future matching
```

---

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database + Auth + Storage**: Supabase (PostgreSQL)
- **AI**: Anthropic API -- claude-sonnet-4-20250514
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (Pro plan)
- **Domain**: usetalentagent.com (Namecheap)
- **GitHub OAuth**: For candidate GitHub ingestion

---

## Database Tables (all in Supabase)

### Core tables
- `profiles` -- extends Supabase auth.users, role is 'candidate' or 'recruiter'
- `candidate_profiles` -- rich profile data: systems built, hardest problems, preferences, comp
- `buyer_agents` -- recruiter role agents with JD plus hidden context
- `company_profiles` -- persistent company knowledge base above individual roles
- `fit_assessments` -- manual assessment results (older flow)

### GitHub ingestion
- `github_profiles` -- OAuth token, ingestion status, technical fingerprint JSON
- `repo_analyses` -- per-repo Claude analysis for top 15 repos

### LinkedIn integration
- `linkedin_profiles` -- parsed employment history, skills, education
- `profile_cross_references` -- GitHub vs LinkedIn consistency analysis

### Matching and marketplace
- `job_postings` -- crawled from Greenhouse and Lever APIs
- `autonomous_matches` -- agent-generated matches with full match_status lifecycle
- `agent_settings` -- per-candidate agent behavior settings
- `notifications` -- real-time notifications for both sides

### Reveal and ratings
- `match_ratings` -- post-reveal and post-conversation ratings from both sides
- `trust_scores` -- aggregated ratings per candidate and company (visible after 5+ ratings)

### Onboarding
- `onboarding_sessions` -- tracks candidate onboarding step completion
- `candidate_signals` -- LinkedIn, Stack Overflow, video, case study

### JD parsing and ATS
- `jd_parses` -- JD parse history and follow-up question answers
- `agent_templates` -- auto-generated templates from recruiter patterns
- `ats_connections` -- Greenhouse and Lever API credentials

### Company document ingestion
- `company_documents` -- uploaded PDFs, PPTX, URLs with extraction results
- `company_profile_drafts` -- synthesized draft from all documents pending review

---

## Match Status Lifecycle

```
discovered → assessed → below_threshold
                     → pending_candidate → candidate_dismissed
                                        → candidate_confirmed → pending_company
                                                              → company_dismissed
                                                              → company_confirmed → mutual_confirmed
                                                                                 → revealed
                                                                                 → in_conversation
                                                                                 → offer_made
                                                                                 → hired
                                                                                 → closed_no_hire
```

---

## Key API Routes Built

### Candidate
- `POST /api/github/connect` -- redirect to GitHub OAuth
- `GET /api/github/callback` -- OAuth callback, save token
- `POST /api/github/ingest` -- staged ingestion: discover repos → fetch details → Claude analyze per repo → synthesize fingerprint
- `GET /api/github/status` -- poll ingestion progress (used for live progress UI)
- `POST /api/github/correct` -- save candidate corrections to fingerprint
- `POST /api/github/sync` -- re-run ingestion (weekly cron)
- `POST /api/linkedin/parse` -- parse LinkedIn text paste or PDF, run cross-reference
- `GET /api/linkedin/status` -- parse status

### Recruiter
- `POST /api/jd/parse` -- parse JD text, extract structured fields, generate 3 follow-up questions
- `POST /api/jd/create-agent` -- create buyer agent from parsed JD plus answers
- `POST /api/company/ingest-document` -- upload company document, extract fields, synthesize profile draft
- `POST /api/company/apply-draft` -- apply reviewed draft to company profile
- `GET /api/company/documents` -- list documents for a company profile
- `POST /api/ats/push-candidate` -- push revealed candidate to Greenhouse or Lever

### Matching
- `POST /api/agents/coordinate` -- run 5-turn bilateral agent dialogue, produce match assessment
- `POST /api/match/run` -- cron job: run matching for all candidates vs all active roles
- `POST /api/match/run-for-agent` -- immediate matching when new buyer agent is created
- `POST /api/matches/confirm` -- candidate or recruiter confirms/dismisses a match
- `GET /api/matches/[id]` -- return match with role-appropriate anonymization
- `POST /api/outreach/draft` -- draft introduction email after mutual confirmation
- `POST /api/outreach/send` -- send approved outreach email via Resend

### Crawler
- `POST /api/crawler/run` -- cron job: crawl Greenhouse and Lever for new job postings

### Ratings
- `POST /api/ratings/submit` -- submit post-reveal or post-conversation rating

### Notifications
- `GET /api/notifications` -- polled every 60 seconds by frontend

---

## Pages Built

### Candidate dashboard
- `/dashboard` -- overview with agent status, opportunities summary, onboarding progress
- `/dashboard/onboarding` -- 6-step onboarding: GitHub connect → ingestion progress → fingerprint review → additional signals → preferences → agent ready
- `/dashboard/profile` -- 7-section rich profile builder with auto-save
- `/dashboard/github` -- GitHub fingerprint display with all signal categories
- `/dashboard/linkedin` -- LinkedIn paste/PDF upload + cross-reference display
- `/dashboard/opportunities` -- agent-surfaced matches feed with 3 card states (pending/waiting/revealed)
- `/dashboard/agent` -- agent behavior settings and notification thresholds

### Recruiter dashboard
- `/dashboard` -- overview with buyer agents, match pipeline stats
- `/dashboard/companies` -- list of company profiles with completeness scores
- `/dashboard/companies/new` -- two paths: upload documents OR fill manually
- `/dashboard/companies/[id]` -- company profile editor with Manual and From Documents tabs
- `/dashboard/agents` -- list of buyer agents
- `/dashboard/agents/new` -- 3-step JD-first flow: paste JD → review parsed fields + answer questions → agent created
- `/dashboard/integrations` -- Greenhouse, Lever, bookmarklet
- `/dashboard/integrations/bookmarklet` -- draggable bookmarklet generator
- `/dashboard/matches` -- kanban match queue: Pending Review / Waiting on Candidate / Mutual Confirmed / In Conversation

---

## Prompts Architecture (lib/anthropic/prompts.ts)

Key prompt functions:
- `buildBuyerAgentPrompt(buyerAgent, companyProfile)` -- injects both role-specific and company-level context
- `buildCandidateAgentPromptWithGitHub(profile, fingerprint, repoAnalyses)` -- GitHub evidence as primary source of truth
- `buildCoordinatorPromptWithCalibration(candidateTrustScore, companyTrustScore)` -- adjusts weighting based on historical rating data
- `buildGithubAnalysisPrompt(githubData)` -- per-repo analysis
- `buildAutonomousMatchPrompt(candidate, fingerprint, jobPosting)` -- full bilateral match assessment
- `buildAnonymizedCompanyView(jobPosting, companyProfile, fitReport)` -- what candidate sees before reveal
- `buildAnonymizedCandidateView(candidateProfile, fingerprint, fitReport)` -- what recruiter sees before reveal

---

## Anonymization Layer (lib/utils/anonymize.ts)

- `buildAnonymizedCompanyView()` -- hides company name, shows stage/industry/culture signals
- `buildAnonymizedCandidateView()` -- hides candidate name, shows technical profile with GitHub evidence
- `generateCompanyAlias()` -- consistent but anonymous descriptor e.g. "Series B Fintech"
- `generateCandidateAlias()` -- e.g. "Senior Go Engineer"
- `anonymizeLocation()` -- city → region

---

## Cron Jobs (vercel.json)

- `/api/crawler/run` -- daily at 8am UTC (crawls Greenhouse + Lever)
- `/api/match/run` -- daily at 9am UTC (runs matching for all candidates vs all roles)
- `/api/github/sync` -- weekly Sunday midnight (re-ingests GitHub profiles)

All protected by CRON_SECRET in Authorization header.

---

## Seed Data

Script at `scripts/seed.ts` -- run with `npm run seed`

Creates:
- 3 recruiters at: meridianfinance.io, devtoolspro.com, healthtechsolutions.com
- 3 company profiles: Meridian Finance (fintech, seed), DevTools Pro (dev tools, series B), HealthTech Solutions (healthcare, series B)
- 6 buyer agents (2 per company)
- 300 candidates: 50 per buyer agent broken into strong (5), medium (20), poor (25) matches
- 300 autonomous matches with varied status across the pipeline

**Recruiter logins:**
- sarah.chen@meridianfinance.io / Recruiter123!
- james.wilson@devtoolspro.com / Recruiter123!
- emily.rodriguez@healthtechsolutions.com / Recruiter123!

**Sample candidate logins (strong matches):**
- sarah.chen.1@devmail.test / TestPass123!
- marcus.chen.2@devmail.test / TestPass123!

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://usetalentagent.com/api/github/callback
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://usetalentagent.com
RESEND_API_KEY= (for outreach emails -- not yet set up)
```

---

## What Is Currently Working

- Full auth flow with email confirmation disabled
- Recruiter dashboard with match queue kanban
- Candidate dashboard with opportunities feed
- GitHub OAuth connection
- GitHub ingestion engine (staged, with per-repo Claude analysis)
- Fingerprint display with all signal categories
- Company profile creation (manual form)
- Buyer agent creation (JD parser flow)
- Bilateral coordinator agent
- Anonymized match views
- Reveal mechanic (mutual confirmation triggers reveal)
- Rating system
- Notification bell
- Seed data with 300 matches
- Deployed to usetalentagent.com on Vercel

## What Was Recently Built (may need testing)

- LinkedIn paste + PDF ingestion with cross-reference analysis
- Company document ingestion (upload culture deck, engineering handbook, etc)
- JD parser with auto-extraction and smart follow-up questions
- ATS connections (Greenhouse, Lever)
- Browser bookmarklet generator
- Agent templates (auto-generated from recruiter patterns)
- Automatic matching on buyer agent creation

## What Is Not Yet Built

- Resend email integration for actual outreach sending
- Stack Overflow profile ingestion
- Video introduction upload
- Case study / work sample section
- Merge.dev unified ATS integration
- Candidate watchlist for target companies
- Agent-initiated outreach to companies not yet on platform
- Mobile responsive design
- Bias audit and EEOC compliance layer
- Payment processing (Stripe) for per-introduction billing

---

## Go To Market Status

**Warm contacts:**
- 3 third-party technical recruiters who tested early version and loved it
- 1 internal technical recruiter at Rivian willing to pilot

**Strategy:**
- Target internal technical recruiters at employer companies (not agencies)
- Focus on companies with hard technical roles and strong employer brands
- Rivian as proof point → expand to Waymo, Anduril, Scale AI, Aurora
- Candidates acquired through employer brand pull ("Rivian is sourcing through TalentAgent")

**First milestone:**
- One bilateral confirmation where both sides confirmed interest and had a human conversation

---

## Key Product Decisions Made

- Employer-side technical recruiters (not agencies) are the primary customer
- Candidates are free -- employer pays per qualified introduction
- Pricing target: $1,000-3,000 per bilateral confirmation
- GitHub evidence weighted more heavily than self-reported claims in matching
- Anonymized reveal is non-negotiable -- both sides must confirm before names are exchanged
- Ratings are private individually but aggregated trust scores become visible after 5+ ratings
- No ATS replacement -- we hand off after the reveal
- No content feed or professional network -- pure matching and hiring workflow

---

## Architecture Principles

When building new features:
- Never show company name or candidate name until match_status = 'revealed'
- GitHub evidence always outweighs self-reported profile claims
- Every judgment in a fit report must be backed by specific evidence
- Honest gaps are as important as strengths -- they build trust
- Auto-save on all forms (500ms debounce)
- All cron endpoints verify CRON_SECRET in Authorization header
- Use admin Supabase client for autonomous_matches queries (RLS blocks recruiter queries otherwise)

---

## How to Resume Building

To continue building in a new conversation:

1. Paste this entire document at the start of the conversation
2. Say "We are building TalentAgent. Here is the current state. I need help with [specific thing]"
3. The instruction files for each major feature are in ~/Desktop/talentagent/ -- reference them by name if relevant

The five instruction files in the project:
- `claude_code_instructions.md` -- base app
- `agentic_layer_instructions.md` -- GitHub ingestion + crawler + autonomous matching
- `company_profile_coordinator_instructions.md` -- company knowledge base + coordinator agent
- `reveal_mechanic_rating_system.md` -- anonymized reveal + rating system
- `github_ingestion_instructions.md` -- deep GitHub ingestion engine
- `linkedin_integration_instructions.md` -- LinkedIn + cross-reference
- `jd_parser_instructions.md` -- JD parser + ATS integrations + bookmarklet
- `company_document_ingestion_instructions.md` -- company profile from documents

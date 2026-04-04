/**
 * TalentAgent Seed Script
 * Run with: npx ts-node scripts/seed.ts
 *        or: npx tsx scripts/seed.ts
 *
 * Generates: 3 recruiters, 3 companies, 6 buyer agents, 300 candidates, 300 matches
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Name Pool ────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Alex', 'Sarah', 'Marcus', 'Jordan', 'Priya', 'David', 'Emily', 'Kevin',
  'Aisha', 'Carlos', 'Lisa', 'Michael', 'Nadia', 'Ryan', 'Yuki', 'Wei',
  'Fatima', 'James', 'Olivia', 'Raj', 'Maya', 'Tyler', 'Nina', 'Andre',
  'Sofia', 'Chris', 'Leila', 'Daniel', 'Emma', 'Sean',
]
const LAST_NAMES = [
  'Chen', 'Kim', 'Johnson', 'Rodriguez', 'Patel', 'Williams', 'Thompson',
  'Garcia', 'Lee', 'Martinez', 'Anderson', 'Taylor', 'Brown', 'Wilson',
  'Davis', 'Miller', 'Jones', 'White', 'Clark', 'Thomas', 'Harris',
  'Lewis', 'Robinson', 'Walker', 'Hall', 'Young', 'Allen', 'King',
  'Wright', 'Scott',
]

function nameAt(globalIdx: number) {
  const first = FIRST_NAMES[globalIdx % FIRST_NAMES.length]
  const last = LAST_NAMES[Math.floor(globalIdx / FIRST_NAMES.length) % LAST_NAMES.length]
  return { first, last, full: `${first} ${last}` }
}

function email(first: string, last: string, idx: number) {
  return `${first.toLowerCase()}.${last.toLowerCase()}.${idx}@devmail.test`
}

// ─── Recruiter / Company / Agent Definitions ─────────────────────────────────

const CANDIDATE_PASSWORD = 'Candidate123!'
const RECRUITER_PASSWORD = 'Recruiter123!'

const RECRUITERS = [
  { email: 'sarah.chen@meridianfinance.io', full_name: 'Sarah Chen', password: RECRUITER_PASSWORD },
  { email: 'mike.thompson@buildkitlabs.io', full_name: 'Mike Thompson', password: RECRUITER_PASSWORD },
  { email: 'jennifer.martinez@careconnect.io', full_name: 'Jennifer Martinez', password: RECRUITER_PASSWORD },
]

const COMPANIES = [
  {
    recruiter_idx: 0,
    company_name: 'Meridian Finance',
    company_website: 'https://meridianfinance.io',
    company_size: '11-50',
    company_stage: 'series_a',
    industry: 'Fintech',
    headquarters: 'San Francisco, CA',
    founded_year: 2020,
    core_languages: ['Python', 'Go', 'TypeScript'],
    core_frameworks: ['FastAPI', 'Gin', 'React', 'SQLAlchemy'],
    core_infrastructure: ['AWS', 'PostgreSQL', 'Redis', 'Kafka'],
    core_tools: ['GitHub Actions', 'Terraform', 'Datadog', 'PagerDuty'],
    crm_and_business_tools: ['Linear', 'Notion', 'Slack', 'Stripe'],
    engineering_values: 'We ship fast, we own our mistakes, and we never blame the product for an engineering failure. Code review is collaborative, not gatekeeping.',
    engineering_culture: 'Small, senior team. Everyone writes code including the CTO. No dedicated QA — engineers own quality end to end. Async-first with daily 30-min standup. Strong bias for doing less but doing it extremely well.',
    deployment_frequency: 'Multiple times per day',
    oncall_expectations: 'Rotating on-call weekly. Incidents are rare but high stakes — we move serious money.',
    code_review_culture: 'All PRs require one approval. We optimize for learning and fast iteration, not perfection. Comments are questions, not mandates.',
    architecture_philosophy: 'Boring technology where possible. Kafka for event sourcing, PostgreSQL as the source of truth. We resist microservices until monolith pain is real.',
    traits_of_successful_engineers: 'Moves fast without being reckless. Has strong opinions loosely held. Can go from Figma to deployed feature in a week. Asks "why" before "how". Owns failures publicly.',
    traits_that_struggle_here: 'Needs detailed specs before starting. Wants a dedicated architecture review for every PR. Uncomfortable with ambiguity. Prefers large team handoffs over direct ownership.',
    why_engineers_join: 'Meaningful equity at Series A. Direct impact on product. Work directly with founders. Modern stack. Serious engineering problems (payments, compliance, real-time fraud detection).',
    why_engineers_leave: 'Startup pace is relentless. Scope can be undefined. Not for people who want stability or process.',
    base_comp_philosophy: 'Top-of-market base (Levels.fyi P75). We do not negotiate hard — first offer is a strong offer.',
    equity_structure: '0.1–0.5% depending on seniority, 4-year vest, 1-year cliff, 10-year exercise window post-termination.',
    health_benefits: 'Fully covered medical, dental, vision (you + dependents). One Medical subscription.',
    pto_policy: 'Unlimited PTO, minimum 15 days encouraged. Company closes last week of December.',
    remote_policy: 'Remote-first. Quarterly company offsites (SF). Monthly optional team dinners in SF.',
    learning_and_development: '$2,500/year L&D budget. Conference sponsorship. Weekly internal tech talks.',
    other_benefits: 'Home office setup ($1,500 stipend), DoorDash credits ($200/month), 401k with 4% match.',
    interview_process_overview: 'Screen (30m) → Technical screen with take-home (90m + async review) → System design (60m) → Values/team fit (45m) → Offer',
    typical_timeline: '2–3 weeks from first contact to offer',
    interview_stages: JSON.stringify([
      { stage: 'Recruiter Screen', duration: '30m', focus: 'Background, motivations, logistics' },
      { stage: 'Technical Screen', duration: '90m async', focus: 'Take-home: build a small REST API with auth and rate limiting' },
      { stage: 'System Design', duration: '60m live', focus: 'Design a payment processing pipeline handling 10k TPS' },
      { stage: 'Values & Team Fit', duration: '45m', focus: 'Meet 2 team members, discuss past incidents and ownership' },
    ]),
    glassdoor_rating: 4.4,
    open_source_projects: JSON.stringify(['meridian-py-sdk']),
    always_emphasize: 'The equity upside at this stage. The quality of the engineering team. The fact that problems are genuinely hard.',
    never_misrepresent: 'Work-life balance — this is a startup and crunch happens. Do not oversell process maturity.',
  },
  {
    recruiter_idx: 1,
    company_name: 'BuildKit Labs',
    company_website: 'https://buildkitlabs.io',
    company_size: '51-200',
    company_stage: 'series_b',
    industry: 'Developer Tools',
    headquarters: 'Remote (NYC incorporated)',
    founded_year: 2018,
    core_languages: ['TypeScript', 'Rust', 'Go'],
    core_frameworks: ['Node.js', 'React', 'Axum', 'gRPC'],
    core_infrastructure: ['Kubernetes', 'GCP', 'Terraform', 'Prometheus'],
    core_tools: ['GitHub Actions', 'ArgoCD', 'Grafana', 'Sentry'],
    crm_and_business_tools: ['Linear', 'Notion', 'Slack', 'Stripe'],
    engineering_values: 'We eat our own dog food. Every engineer uses the product daily. Performance is a feature. Developer experience is a product — internal and external.',
    engineering_culture: 'Deep technical craft is celebrated. Rust is used where it matters for performance. TypeScript everywhere else. Strong open source culture — several engineers are prominent OSS contributors. High autonomy, minimal process.',
    deployment_frequency: 'Continuous (feature flags)',
    oncall_expectations: 'Lightweight on-call. SLA-driven alerting. Most incidents are < P2.',
    code_review_culture: 'Async PRs, small diffs preferred. Automated style + lint + type checks in CI. Human review focuses on architecture and correctness.',
    architecture_philosophy: 'Distributed systems for the product core. Rust for the CLI and performance-critical paths. TypeScript for everything else. We avoid premature optimization but benchmark aggressively.',
    traits_of_successful_engineers: 'Cares deeply about developer experience. Can implement in Rust when performance demands it. Strong opinions about API ergonomics. Contributes to OSS. Reads papers.',
    traits_that_struggle_here: 'Only comfortable with web frameworks. Thinks Rust is "too hard". Does not use the product. Prefers consensus over individual craft ownership.',
    why_engineers_join: 'Work on tools that 50,000 developers use daily. Strong technical culture. Fully remote with great async practices. Competitive equity at Series B.',
    why_engineers_leave: 'Fully remote can be isolating. Deep technical problems take time — not for people who want quick feature shipping. Rust learning curve is steep.',
    base_comp_philosophy: 'Above market. We do not believe in lowballing. Transparent bands published internally.',
    equity_structure: '0.05–0.2% at Series B, 4-year vest, 1-year cliff, refreshes after 2 years.',
    health_benefits: 'Fully covered medical, dental, vision. Dependent coverage included.',
    pto_policy: 'Flexible PTO with a 20-day minimum. Async-friendly — take time without guilt.',
    remote_policy: 'Fully remote globally. Annual all-hands (1 week). Optional co-working stipend ($300/month).',
    learning_and_development: '$3,000/year L&D budget. RustConf and KubeCon sponsored. Internal RFCs encouraged.',
    other_benefits: 'Home office ($2,000 stipend), top-of-line laptop choice, mental health coverage (Headspace+).',
    interview_process_overview: 'Async screen → Rust/TS coding challenge → Systems design → Craft interview with team → Offer',
    typical_timeline: '3–4 weeks',
    interview_stages: JSON.stringify([
      { stage: 'Async Screen', duration: '30m async video', focus: 'Technical background, OSS work, motivations' },
      { stage: 'Coding Challenge', duration: '4h async', focus: 'Build a CLI tool in Rust or TypeScript with specified behavior' },
      { stage: 'Systems Design', duration: '60m live', focus: 'Design a distributed build cache with invalidation' },
      { stage: 'Craft Interview', duration: '60m panel', focus: 'Deep dive on past technical work, code quality, OSS contributions' },
    ]),
    glassdoor_rating: 4.6,
    notable_engineering_blog_url: 'https://buildkitlabs.io/blog',
    open_source_projects: JSON.stringify(['buildkit-cli', 'buildkit-operator', 'rustkit']),
    always_emphasize: 'The technical depth. The open source work. The fully remote culture. The fact that engineers have real ownership.',
    never_misrepresent: 'Career progression is slower than a FAANG. It is a craft-first environment, not a promotion-first one.',
  },
  {
    recruiter_idx: 2,
    company_name: 'CareConnect Health',
    company_website: 'https://careconnect.io',
    company_size: '201-500',
    company_stage: 'series_b',
    industry: 'Healthcare Technology',
    headquarters: 'Boston, MA',
    founded_year: 2016,
    core_languages: ['Java', 'Python', 'SQL'],
    core_frameworks: ['Spring Boot', 'FastAPI', 'React', 'Hibernate'],
    core_infrastructure: ['AWS', 'PostgreSQL', 'Kafka', 'Kubernetes'],
    core_tools: ['Jenkins', 'Terraform', 'Datadog', 'SonarQube'],
    crm_and_business_tools: ['Jira', 'Confluence', 'Slack', 'Salesforce'],
    engineering_values: 'Reliability is not optional — lives depend on our systems. We value careful, testable, auditable code. Move thoughtfully, never break things.',
    engineering_culture: 'Strong testing culture (>80% coverage required). HIPAA compliance is everyone\'s concern. Code reviews are thorough. Architecture decisions go through an RFC process. Senior engineers are expected to mentor.',
    deployment_frequency: 'Weekly releases (staging → canary → production)',
    oncall_expectations: 'Rotating on-call (monthly). Clinical-grade SLAs. High-severity incidents have escalation paths.',
    code_review_culture: 'All PRs require 2 approvals. Automated SAST and dependency scanning. Security review for any PHI-touching changes.',
    architecture_philosophy: 'Microservices with strong service contracts. Event-driven for async workflows. Java for transactional core. Python for data pipelines and ML inference.',
    traits_of_successful_engineers: 'Takes compliance seriously without being paralyzed by it. Writes tests first. Can explain trade-offs clearly. Comfortable in a regulated environment. Strong mentorship instincts.',
    traits_that_struggle_here: 'Move fast and break things mentality. Allergic to process. Weak testing discipline. Has never worked in a regulated industry. Poor documentation habits.',
    why_engineers_join: 'Meaningful mission (real patient outcomes). Technical depth in a regulated domain. Strong mentorship culture. Stable growth-stage company. Good benefits.',
    why_engineers_leave: 'Slower pace than startups. More process than some prefer. Hybrid requirement is a dealbreaker for fully remote engineers.',
    base_comp_philosophy: 'Market-rate (Levels.fyi P60-70). We invest more in benefits and stability than top-of-market cash.',
    equity_structure: '0.01–0.05% at Series B, 4-year vest, standard 1-year cliff.',
    health_benefits: 'Gold-tier medical, dental, vision. HSA with $1,500 annual company contribution.',
    pto_policy: '20 days PTO + 10 sick days + 11 federal holidays. Generous parental leave (16 weeks primary, 8 secondary).',
    remote_policy: 'Hybrid — Boston office 2 days/week required (Tuesday and Thursday). Fully remote considered case-by-case for exceptional candidates.',
    learning_and_development: '$2,000/year L&D budget. HIMSS conference sponsorship. Internal engineering book club.',
    other_benefits: 'Commuter benefits, 401k with 5% match, life insurance, disability coverage.',
    interview_process_overview: 'HR Screen → Technical phone screen → Take-home project → System design + panel → References → Offer',
    typical_timeline: '4–5 weeks',
    interview_stages: JSON.stringify([
      { stage: 'HR Screen', duration: '30m', focus: 'Background, compensation, logistics' },
      { stage: 'Technical Phone Screen', duration: '60m', focus: 'Java/Python fundamentals, system design concepts' },
      { stage: 'Take-home Project', duration: '4h async', focus: 'Build a FHIR-compliant patient data API with proper auth' },
      { stage: 'System Design + Panel', duration: '90m', focus: 'Design a PHI-safe event streaming system; panel with 3 engineers' },
      { stage: 'Reference Check', duration: 'Async', focus: '2 professional references, 1 manager preferred' },
    ]),
    glassdoor_rating: 4.2,
    open_source_projects: JSON.stringify(['careconnect-fhir-sdk']),
    always_emphasize: 'Mission impact. The technical depth of healthcare data. Stability and growth. Strong benefits.',
    never_misrepresent: 'The hybrid requirement. The process-heavy culture. Pace is slower than a pure startup.',
  },
]

const AGENT_SPECS = [
  // ── Meridian Finance ───────────────────────────────────────────────
  {
    company_idx: 0,
    role_title: 'Senior Backend Engineer',
    jd: `We're looking for a Senior Backend Engineer to join our core payments team at Meridian Finance.

You'll own critical infrastructure: payment processing, ledger reconciliation, fraud detection, and the event sourcing backbone that powers all financial transactions.

Responsibilities:
- Design and implement high-throughput payment APIs (Python + Go)
- Own the Kafka event streaming pipeline for financial transactions
- Build fraud detection models with the data science team
- Lead technical design for new features affecting the payment ledger
- On-call rotation for payment-critical systems

Requirements:
- 5+ years backend engineering
- Strong Python (FastAPI or equivalent)
- Go experience preferred
- Distributed systems experience (Kafka, Redis, or similar)
- PostgreSQL — deep query optimization, migrations, indexing
- Financial services or fintech experience a strong plus
- Located in US timezones

Compensation: $180,000–$240,000 base + equity`,
    why_last_candidates_failed: 'Last 4 hires failed the system design round — they could talk distributed systems but had never actually debugged a production Kafka lag incident. One was a strong Python dev but had only worked in batch pipelines, no real-time experience. Another had the skills but clearly wanted a FAANG, not a startup.',
    what_hiring_manager_actually_cares_about: 'Ownership. The HM (our CTO, ex-Stripe) wants someone who will proactively flag problems before they become incidents, not someone who waits for a ticket. Specifically: has the candidate ever been the last line of defense on a production payment system?',
    team_dynamics: '4 engineers total including this hire. Strong senior who has been here 2 years and sets a high bar. One junior who needs mentorship. CTO is hands-on and code-reviews personally. Team is tight-knit.',
    hidden_dealbreakers: 'Anyone who has only worked in batch/ETL — we need real-time. Anyone who has never been on-call for financial systems. Anyone whose last role was purely greenfield — we have a lot of legacy to manage.',
    actual_remote_flexibility: 'Remote-first is real but the quarterly SF offsites are mandatory attendance. If someone is international, that gets complicated with visas. US timezones strongly preferred (PST/MST/CST/EST all fine).',
    comp_band_min: 180000,
    comp_band_max: 240000,
    required_skills: JSON.stringify(['Python', 'Go', 'PostgreSQL', 'Kafka', 'Distributed systems', 'AWS']),
    preferred_skills: JSON.stringify(['FastAPI', 'Redis', 'Fintech experience', 'Payment systems']),
    years_experience_min: 5,
    years_experience_max: 12,
    // For candidate generation
    strong_stack: ['Python', 'Go', 'PostgreSQL', 'Kafka', 'Redis', 'AWS'],
    strong_titles: ['Senior Backend Engineer', 'Staff Engineer', 'Senior Software Engineer'],
    medium_gaps: ['no_go', 'no_kafka', 'comp_high', 'junior_4yr', 'no_fintech'],
    poor_reasons: ['java_only', 'frontend_only', 'too_junior', 'comp_way_off', 'visa_required', 'dotnet'],
  },
  {
    company_idx: 0,
    role_title: 'Senior Full Stack Engineer',
    jd: `Meridian Finance is hiring a Senior Full Stack Engineer to build the customer-facing product experience.

You'll work across the entire stack: React frontend for our financial dashboard, Go APIs, and the data layer. This is not a pure frontend role — we expect you to own features end to end.

Responsibilities:
- Build and own React-based financial dashboards (real-time data, complex state)
- Design and implement Go APIs consumed by the frontend
- Collaborate with design to ship pixel-perfect, accessible UIs
- Optimize frontend performance for real-time data updates
- Participate in on-call rotation

Requirements:
- 4+ years full stack experience
- React (hooks, context, performance optimization)
- TypeScript throughout the stack
- Go or equivalent compiled backend language
- Understanding of financial data visualization
- Strong product instinct — you can identify UX problems without a PM

Compensation: $170,000–$230,000 base + equity`,
    why_last_candidates_failed: 'Two candidates were strong frontends who hated writing backend. One was a Go expert who wrote React like it was 2015 (class components, no hooks, no TypeScript). The problem is we need someone who genuinely enjoys both sides.',
    what_hiring_manager_actually_cares_about: 'Product sensibility. Can they look at a mock and immediately identify 3 edge cases? Do they care about what the user actually experiences, not just whether the API returns 200?',
    team_dynamics: 'This person will be the primary frontend voice on the team. Other engineers can write React but no one truly owns the frontend experience. High-impact, high-visibility role.',
    hidden_dealbreakers: 'Backend engineers who "can do" frontend but haven\'t shipped production React in the last year. Candidates who want to be pure frontend — this is explicitly a full stack role. Anyone who has not used TypeScript in a frontend codebase.',
    actual_remote_flexibility: 'Same as company policy — remote-first, quarterly SF offsites. Must be US timezone.',
    comp_band_min: 170000,
    comp_band_max: 230000,
    required_skills: JSON.stringify(['React', 'TypeScript', 'Go', 'REST APIs', 'PostgreSQL']),
    preferred_skills: JSON.stringify(['Financial data visualization', 'D3.js or similar', 'GraphQL', 'Figma familiarity']),
    years_experience_min: 4,
    years_experience_max: 10,
    strong_stack: ['React', 'TypeScript', 'Go', 'PostgreSQL', 'REST APIs'],
    strong_titles: ['Full Stack Engineer', 'Senior Software Engineer', 'Frontend Lead'],
    medium_gaps: ['weak_go', 'no_typescript', 'comp_high', 'backend_focused', 'junior_3yr'],
    poor_reasons: ['backend_only', 'java_frontend', 'too_junior', 'comp_way_off', 'no_react'],
  },
  // ── BuildKit Labs ─────────────────────────────────────────────────
  {
    company_idx: 1,
    role_title: 'Staff Software Engineer',
    jd: `BuildKit Labs is looking for a Staff Software Engineer to lead the core SDK and CLI experience.

Our product is used by 50,000 developers daily. You'll own the TypeScript SDK and Rust CLI that they interact with most. This is high-craft, high-ownership engineering.

Responsibilities:
- Lead design and implementation of the TypeScript SDK public API
- Own the Rust CLI — performance, ergonomics, cross-platform builds
- Drive API design decisions with input from developer community
- Mentor 3–4 senior engineers on the core team
- Write and review RFCs for major architectural changes

Requirements:
- 7+ years software engineering
- Expert TypeScript (Node.js, type system depth, async patterns)
- Rust — must have shipped production Rust code
- Strong opinions about developer experience and API design
- Open source contributions (ideally significant)
- Experience with CLI tooling or SDK development

Compensation: $200,000–$280,000 base + equity`,
    why_last_candidates_failed: 'Rust was the filter. We had two brilliant TypeScript engineers who learned Rust for interviews but had never shipped anything real in it. We also had a strong Rust systems programmer who wrote TypeScript like Go — no ergonomics, no type-level abstractions.',
    what_hiring_manager_actually_cares_about: 'Taste. The HM wants someone who has strong opinions about DX and can defend them. They should be able to look at our current SDK and immediately have 5 specific improvement ideas. GitHub contributions are read before the interview.',
    team_dynamics: 'Staff role — this person leads the Core SDK team (4 engineers). Directly reports to VP Engineering. High autonomy. Expected to push back on product prioritization when DX trade-offs are involved.',
    hidden_dealbreakers: 'No open source presence. Rust experience that is only LeetCode / tutorials. Someone who does not actually use developer tools daily (we can tell). Anyone who has only shipped internal tools, not customer-facing SDKs.',
    actual_remote_flexibility: 'Fully remote, no exceptions. Global time zones accommodated. Annual all-hands is the only synchronous requirement (1 week, location rotates).',
    comp_band_min: 200000,
    comp_band_max: 280000,
    required_skills: JSON.stringify(['TypeScript', 'Rust', 'Node.js', 'SDK design', 'CLI development']),
    preferred_skills: JSON.stringify(['gRPC', 'WASM', 'Open source contributions', 'Technical writing']),
    years_experience_min: 7,
    years_experience_max: 15,
    strong_stack: ['TypeScript', 'Rust', 'Node.js', 'CLI tools', 'Open source'],
    strong_titles: ['Staff Engineer', 'Principal Engineer', 'Senior Software Engineer'],
    medium_gaps: ['no_rust', 'no_oss', 'comp_high', 'no_sdk_exp', 'junior_5yr'],
    poor_reasons: ['python_only', 'no_typescript', 'too_junior', 'comp_way_off', 'no_systems_exp', 'java_only'],
  },
  {
    company_idx: 1,
    role_title: 'Senior Platform Engineer',
    jd: `BuildKit Labs is hiring a Senior Platform Engineer to own our Kubernetes-based build infrastructure.

You'll build the platform that powers 10,000+ concurrent build jobs daily. This is not Kubernetes administration — it is software engineering on top of Kubernetes.

Responsibilities:
- Build and maintain Kubernetes operators in Go for build scheduling
- Design and implement the autoscaling system for build workers
- Own CI/CD infrastructure (ArgoCD, GitHub Actions, Helm)
- Build internal developer platform tooling used by 80+ engineers
- On-call for platform incidents

Requirements:
- 5+ years backend engineering, 3+ years Kubernetes
- Go — must be proficient (operators, controllers, client-go)
- Kubernetes internals knowledge (controllers, CRDs, admission webhooks)
- Terraform for infrastructure as code
- Experience building platforms for internal developer consumers (not just ops)

Compensation: $190,000–$260,000 base + equity`,
    why_last_candidates_failed: 'Most "Kubernetes engineers" are actually Kubernetes administrators — they can run kubectl and write Helm charts but have never written a controller. We need a software engineer who builds ON Kubernetes, not someone who runs it.',
    what_hiring_manager_actually_cares_about: 'Has the candidate actually written a Kubernetes operator in Go? Can they explain controller-runtime internals? Do they think about internal developers as customers whose experience matters?',
    team_dynamics: 'Platform team of 3 (including this hire). Reports to VP Engineering. Works closely with all product teams who are their customers. High visibility — when platform has an incident, everyone knows.',
    hidden_dealbreakers: 'Sysadmin / DevOps background without software engineering — we write code, not just config. Anyone who has only used managed Kubernetes (EKS/GKE as a consumer, not as a platform builder). No Go experience.',
    actual_remote_flexibility: 'Fully remote. On-call is async-first (no phone calls unless P1). Being in a US timezone is helpful but not required for this role specifically.',
    comp_band_min: 190000,
    comp_band_max: 260000,
    required_skills: JSON.stringify(['Kubernetes', 'Go', 'Terraform', 'ArgoCD', 'CI/CD', 'Linux']),
    preferred_skills: JSON.stringify(['Kubernetes operators', 'controller-runtime', 'Prometheus', 'eBPF']),
    years_experience_min: 5,
    years_experience_max: 12,
    strong_stack: ['Go', 'Kubernetes', 'Terraform', 'Linux', 'ArgoCD'],
    strong_titles: ['Platform Engineer', 'Senior Software Engineer', 'Infrastructure Engineer'],
    medium_gaps: ['weak_go', 'k8s_admin_only', 'no_terraform', 'junior_4yr', 'comp_high'],
    poor_reasons: ['java_only', 'python_only', 'no_k8s', 'too_junior', 'comp_way_off', 'frontend_only'],
  },
  // ── CareConnect Health ────────────────────────────────────────────
  {
    company_idx: 2,
    role_title: 'Senior Backend Engineer',
    jd: `CareConnect Health is hiring a Senior Backend Engineer for our clinical data platform team.

You'll build and maintain the APIs and services that process patient data for 200+ healthcare providers. HIPAA compliance, reliability, and correctness are non-negotiable.

Responsibilities:
- Build and maintain Java/Spring Boot microservices handling PHI
- Design FHIR-compliant APIs for EHR integration
- Implement audit logging and access control for HIPAA compliance
- Write comprehensive test suites (unit, integration, contract tests)
- Participate in architecture review and RFC process

Requirements:
- 5+ years backend engineering
- Java (Spring Boot, Spring Security, JPA/Hibernate)
- PostgreSQL with strong SQL skills
- Microservices architecture experience
- Healthcare or regulated industry experience strongly preferred
- HIPAA or SOC 2 experience a plus
- Boston area or willing to relocate (hybrid 2 days/week)

Compensation: $160,000–$220,000 base + equity`,
    why_last_candidates_failed: 'Technical skills were there, but three candidates clearly did not understand or care about regulated industry constraints. One asked "why do we need audit logging?" and that ended the interview. Another had great Java skills but their entire portfolio was startup move-fast work — no compliance mindset at all.',
    what_hiring_manager_actually_cares_about: 'Does the candidate understand that reliability and correctness matter more than speed here? Have they dealt with a HIPAA incident or near-miss? Do they write tests first or as an afterthought?',
    team_dynamics: 'Team of 6 backend engineers. Collaborative RFC process. Strong senior engineers who will mentor. The HM is a former Epic systems architect with 15 years of healthcare experience.',
    hidden_dealbreakers: 'Anyone who has never worked in a regulated industry and isn\'t humble about that gap. Candidates who clearly see this as a stepping stone to a tech company. Anyone resistant to the hybrid office requirement.',
    actual_remote_flexibility: 'The 2-day hybrid is real and firm. Tuesdays and Thursdays in the Boston office. No exceptions unless a candidate is truly exceptional and willing to fly in monthly (has happened once).',
    comp_band_min: 160000,
    comp_band_max: 220000,
    required_skills: JSON.stringify(['Java', 'Spring Boot', 'PostgreSQL', 'Microservices', 'AWS', 'REST APIs']),
    preferred_skills: JSON.stringify(['FHIR', 'HIPAA compliance', 'Healthcare interoperability', 'Kafka']),
    years_experience_min: 5,
    years_experience_max: 12,
    strong_stack: ['Java', 'Spring Boot', 'PostgreSQL', 'AWS', 'Microservices'],
    strong_titles: ['Senior Backend Engineer', 'Senior Software Engineer', 'Java Engineer'],
    medium_gaps: ['no_healthcare', 'weak_java', 'comp_high', 'junior_4yr', 'remote_only'],
    poor_reasons: ['python_only', 'frontend_only', 'too_junior', 'comp_way_off', 'visa_required', 'typescript_only'],
  },
  {
    company_idx: 2,
    role_title: 'Senior Data Engineer',
    jd: `CareConnect Health is looking for a Senior Data Engineer to build our clinical analytics platform.

You'll design and maintain the pipelines that transform raw EHR data into actionable clinical insights for care teams. This data directly influences patient care decisions.

Responsibilities:
- Build and maintain Python-based ETL/ELT pipelines on AWS
- Design the clinical data warehouse (Redshift + dbt)
- Implement PHI-safe data aggregation for analytics
- Build data quality checks and lineage tracking
- Collaborate with clinical informatics team on data models

Requirements:
- 4+ years data engineering
- Python (pandas, PySpark or AWS Glue)
- AWS data services (Glue, EMR, Redshift, S3)
- Strong SQL (window functions, performance tuning)
- Experience with PHI data or equivalent regulated datasets
- dbt or similar transformation tool

Compensation: $170,000–$230,000 base + equity`,
    why_last_candidates_failed: 'Two candidates were Python-first but had minimal AWS — they knew Spark locally but had never managed AWS Glue jobs at scale. One candidate was strong on AWS but had only worked with clickstream/behavioral data, not clinical data with complex privacy requirements.',
    what_hiring_manager_actually_cares_about: 'Data quality obsession. Have they ever traced a bug in clinical reporting back to a pipeline issue? Do they understand the downstream impact of bad data in a healthcare context?',
    team_dynamics: 'Data team of 4 (2 data engineers, 1 data scientist, 1 analytics engineer). Close collaboration with clinical informatics. High autonomy on pipeline design.',
    hidden_dealbreakers: 'Pure data scientists who "also do engineering." Anyone who has only worked with user behavior data — clinical data is structurally and ethically different. Candidates who have never handled PHI and underestimate what that requires.',
    actual_remote_flexibility: 'Same hybrid policy — Boston 2 days/week. The data science team has more flexibility but engineering is expected in office.',
    comp_band_min: 170000,
    comp_band_max: 230000,
    required_skills: JSON.stringify(['Python', 'AWS', 'SQL', 'Apache Spark', 'dbt', 'Redshift']),
    preferred_skills: JSON.stringify(['AWS Glue', 'Clinical data', 'HIPAA', 'Apache Airflow', 'Kafka']),
    years_experience_min: 4,
    years_experience_max: 10,
    strong_stack: ['Python', 'AWS', 'SQL', 'Spark', 'dbt'],
    strong_titles: ['Senior Data Engineer', 'Data Engineer', 'Senior Software Engineer'],
    medium_gaps: ['weak_aws', 'no_healthcare', 'comp_high', 'junior_3yr', 'no_dbt'],
    poor_reasons: ['java_only', 'frontend_only', 'too_junior', 'comp_way_off', 'no_cloud', 'ml_only'],
  },
]

// ─── Fit Report Builder ───────────────────────────────────────────────────────

type Tier = 'strong' | 'medium' | 'poor'

interface FitScores {
  overall: number
  technical: number
  role: number
  github: number
  recommendation: string
  recommendation_summary: string
}

function computeScores(tier: Tier, idx: number, spec: typeof AGENT_SPECS[0]): FitScores {
  if (tier === 'strong') {
    const base = 80 + (idx % 4) * 3 + (idx % 3)
    const overall = Math.min(97, base)
    return {
      overall,
      technical: Math.min(99, overall + 2 + (idx % 3)),
      role: Math.min(96, overall - 1 + (idx % 4)),
      github: Math.min(95, overall - 3 + (idx % 5)),
      recommendation: overall >= 88 ? 'strong_yes' : 'yes',
      recommendation_summary: `Exceptional candidate for the ${spec.role_title} role. Strong alignment on both technical skills and team fit. ${idx % 2 === 0 ? 'Fintech' : 'Startup'} background directly relevant.`,
    }
  }
  if (tier === 'medium') {
    const base = 52 + (idx % 7) * 3 + (idx % 5)
    const overall = Math.min(76, base)
    return {
      overall,
      technical: Math.min(78, overall + (idx % 7) - 3),
      role: Math.min(75, overall - 2 + (idx % 6)),
      github: Math.min(72, overall - 5 + (idx % 4)),
      recommendation: overall >= 68 ? 'yes' : 'maybe',
      recommendation_summary: `Solid candidate with relevant experience but some notable gaps. ${idx % 3 === 0 ? 'Comp expectations may need alignment.' : idx % 3 === 1 ? 'Missing some key stack experience.' : 'Culture fit questions worth exploring.'}`,
    }
  }
  // poor
  const base = 8 + (idx % 9) * 4
  const overall = Math.min(44, base)
  return {
    overall,
    technical: Math.min(48, overall + (idx % 8) - 4),
    role: Math.min(42, overall - 3 + (idx % 5)),
    github: Math.min(40, overall - 6 + (idx % 6)),
    recommendation: 'no',
    recommendation_summary: `Significant misalignment with the ${spec.role_title} requirements. ${idx % 4 === 0 ? 'Wrong technical stack.' : idx % 4 === 1 ? 'Insufficient experience level.' : idx % 4 === 2 ? 'Compensation expectations far exceed band.' : 'Dealbreakers triggered.'}`,
  }
}

function buildFitReport(tier: Tier, idx: number, spec: typeof AGENT_SPECS[0]) {
  const scores = computeScores(tier, idx, spec)
  const stack = spec.required_skills ? JSON.parse(spec.required_skills as string) : []

  const requirements: any[] = stack.map((skill: string, si: number) => {
    let status: string
    let evidence: string
    if (tier === 'strong') {
      status = 'pass'
      evidence = `${Math.floor(Math.random() * 3) + 4}+ years ${skill} in production environments`
    } else if (tier === 'medium') {
      status = si < 3 ? 'pass' : si === 3 ? 'partial' : 'fail'
      evidence = si < 3
        ? `${Math.floor(Math.random() * 2) + 2}+ years ${skill}`
        : si === 3 ? `Limited ${skill} exposure — 1 year or less`
        : `No direct ${skill} experience identified`
    } else {
      status = si < 1 ? 'partial' : 'fail'
      evidence = si < 1
        ? `Tangential ${skill} exposure only`
        : `No evidence of ${skill} in GitHub or profile`
    }
    return { requirement: skill, status, evidence }
  })

  const greenFlags = tier === 'strong' ? [
    { flag: `Strong ${stack[0]} portfolio`, evidence: `Multiple production ${stack[0]} repos with 100+ commits` },
    { flag: 'Relevant domain experience', evidence: `Previous role directly in ${spec.company_idx === 0 ? 'fintech' : spec.company_idx === 1 ? 'developer tools' : 'healthcare tech'}` },
    { flag: 'Appropriate seniority', evidence: `${5 + (idx % 3)} years of experience, has led technical projects` },
    { flag: 'Startup or high-growth experience', evidence: 'Has shipped in resource-constrained environments before' },
  ] : tier === 'medium' ? [
    { flag: `Solid ${stack[0]} foundation`, evidence: `3+ years ${stack[0]} in professional settings` },
    { flag: 'Shows growth trajectory', evidence: 'Progressive responsibility in last two roles' },
  ] : [
    { flag: 'Some transferable skills', evidence: 'Software engineering fundamentals present' },
  ]

  const yellowFlags = tier === 'strong' ? [
    { flag: idx % 2 === 0 ? 'No explicit fintech experience' : 'Slightly above comp band midpoint' },
  ] : tier === 'medium' ? [
    { flag: `Limited ${stack[idx % stack.length]} experience` },
    { flag: 'Comp expectations near top of band' },
    { flag: 'Has not worked in teams smaller than 20 engineers' },
  ] : [
    { flag: 'Stack mismatch is significant' },
    { flag: 'Would require extensive ramp time' },
  ]

  const redFlags = tier === 'strong' ? [] : tier === 'medium' ? [
    { flag: idx % 3 === 0 ? 'No on-call experience' : idx % 3 === 1 ? 'Missing key skill: ' + stack[stack.length - 1] : 'Team size preference mismatch' },
  ] : [
    { flag: `Missing core requirement: ${stack[0]}` },
    { flag: idx % 4 === 0 ? 'Compensation expectation 40%+ above band' : idx % 4 === 1 ? 'Insufficient years of experience' : idx % 4 === 2 ? 'Requires visa sponsorship (company does not sponsor)' : 'Dealbreaker: ' + (spec.hidden_dealbreakers?.split('.')[0] ?? 'Cultural mismatch') },
  ]

  const screenQuestions = tier !== 'poor' ? [
    `Tell me about a time you debugged a critical production issue in ${stack[0]}.`,
    `How have you handled the transition from a large company to a smaller team?`,
  ] : []

  return {
    ...scores,
    requirements,
    green_flags: greenFlags,
    yellow_flags: yellowFlags,
    red_flags: redFlags,
    screen_questions: screenQuestions,
  }
}

// ─── Candidate Profile Builder ───────────────────────────────────────────────

function buildGithubFingerprint(tier: Tier, spec: typeof AGENT_SPECS[0], idx: number) {
  const stack = spec.strong_stack
  const username = `dev-user-${spec.company_idx}-${tier[0]}-${idx}`

  if (tier === 'strong') {
    return {
      primary_languages: stack.slice(0, 3),
      language_breakdown: Object.fromEntries(stack.map((l, i) => [l, Math.max(5, 40 - i * 8)])),
      top_repositories: [
        { name: `${stack[0].toLowerCase()}-service`, description: `Production-grade ${stack[0]} microservice`, stars: 80 + idx * 12, primary_language: stack[0], topics: [stack[0].toLowerCase(), 'production', 'scalable'] },
        { name: `distributed-${stack[1]?.toLowerCase() ?? 'system'}`, description: `Distributed systems project in ${stack[1] ?? stack[0]}`, stars: 45 + idx * 8, primary_language: stack[1] ?? stack[0], topics: ['distributed', 'systems'] },
        { name: 'personal-toolkit', description: 'Utilities and libraries', stars: 23 + idx * 3, primary_language: stack[0], topics: ['utilities'] },
      ],
      key_strengths: [`${stack[0]} expertise`, 'Distributed systems design', 'Production reliability'],
      experience_signals: [`${5 + idx % 3}+ years professional experience`, 'Active open source contributor', 'Regular commit history'],
      architectural_patterns: ['Microservices', 'Event-driven', 'API-first'],
      recent_activity: 'Highly active — commits within last 7 days',
      summary: `Strong ${stack[0]} and ${stack[1] ?? stack[0]} engineer with clear production experience. GitHub history shows consistent high-quality contributions to complex systems.`,
    }
  }

  if (tier === 'medium') {
    const partialStack = stack.slice(0, 2)
    return {
      primary_languages: partialStack,
      language_breakdown: Object.fromEntries(partialStack.map((l, i) => [l, 35 - i * 10])),
      top_repositories: [
        { name: `${partialStack[0].toLowerCase()}-api`, description: `${partialStack[0]} REST API`, stars: 12 + idx * 4, primary_language: partialStack[0], topics: [partialStack[0].toLowerCase()] },
        { name: 'side-project', description: 'Personal side project', stars: 5 + idx * 2, primary_language: partialStack[0], topics: ['personal'] },
      ],
      key_strengths: [`${partialStack[0]} proficiency`, 'Web API development'],
      experience_signals: [`${3 + idx % 3} years professional experience`],
      architectural_patterns: ['REST APIs', 'MVC'],
      recent_activity: 'Moderately active — commits within last 30 days',
      summary: `Competent ${partialStack[0]} engineer with solid fundamentals. Missing some of the advanced stack experience required for this role.`,
    }
  }

  // poor
  const wrongStacks = [['Java', 'Spring'], ['PHP', 'Laravel'], ['.NET', 'C#'], ['Ruby', 'Rails'], ['Vue', 'JavaScript']]
  const wrongStack = wrongStacks[idx % wrongStacks.length]
  return {
    primary_languages: wrongStack,
    language_breakdown: { [wrongStack[0]]: 70, [wrongStack[1]]: 20, HTML: 10 },
    top_repositories: [
      { name: `${wrongStack[0].toLowerCase()}-app`, description: `${wrongStack[0]} application`, stars: 3 + idx, primary_language: wrongStack[0], topics: [wrongStack[0].toLowerCase()] },
    ],
    key_strengths: [`${wrongStack[0]} development`],
    experience_signals: [`${1 + idx % 3} years experience`],
    architectural_patterns: ['MVC', 'CRUD'],
    recent_activity: 'Sporadic — last commit over 60 days ago',
    summary: `${wrongStack[0]} developer with limited relevance to this ${spec.strong_stack[0]}-focused role. Significant ramp time would be required.`,
  }
}

function buildCandidateProfile(tier: Tier, spec: typeof AGENT_SPECS[0], idx: number, userId: string) {
  const stack = spec.strong_stack
  const companyStage = ['early-stage startup', 'growth-stage company', 'enterprise'][spec.company_idx]

  if (tier === 'strong') {
    const yoe = 5 + (idx % 4)
    return {
      user_id: userId,
      current_title: spec.strong_titles[idx % spec.strong_titles.length],
      years_of_experience: yoe,
      primary_languages: stack.slice(0, 3),
      frameworks_and_tools: stack,
      cloud_platforms: ['AWS', 'GCP'].slice(0, 1 + (idx % 2)),
      skill_assessments: Object.fromEntries(stack.slice(0, 4).map((s, i) => [s, { years: yoe - i, self_rating: 8 + (i === 0 ? 1 : 0) }])),
      systems_built: [
        {
          name: `${stack[0]} Payment Processing Service`,
          description: `Built a high-throughput ${stack[0]} service handling 50k requests/min with sub-10ms p99 latency`,
          scale: '50k req/min, 5M daily transactions',
          stack: stack.slice(0, 3).join(', '),
          role: 'Technical lead and primary implementer',
        },
        {
          name: 'Real-time Event Streaming Pipeline',
          description: `Designed and implemented event sourcing with ${stack.includes('Kafka') ? 'Kafka' : 'message queues'} for distributed transaction processing`,
          scale: '1M events/day, 99.99% reliability',
          stack: stack.slice(1, 4).join(', '),
          role: 'Sole engineer, designed architecture from scratch',
        },
        {
          name: 'Internal Developer Platform',
          description: 'Built internal tooling that reduced deployment time from 45 min to 8 min for 20-engineer team',
          scale: '20+ engineers, 50+ services',
          stack: 'Go, Kubernetes, GitHub Actions',
          role: 'Lead engineer, stakeholder management',
        },
      ],
      hardest_problems: [
        {
          problem: 'Database migration with zero downtime on a live payment system processing $2M/day',
          approach: 'Dual-write pattern with shadow reads, gradually shifting traffic over 2 weeks with automated rollback triggers',
          outcome: 'Zero incidents, migration completed in 18 days, zero customer impact',
        },
        {
          problem: 'Diagnosing intermittent data corruption in distributed cache that only manifested under specific concurrency conditions',
          approach: 'Added structured tracing, built a deterministic replay harness, identified race condition in cache invalidation path',
          outcome: 'Root cause found in 3 days, fix deployed, no recurrence in 8 months',
        },
      ],
      honest_strengths: `Deep ${stack[0]} expertise built over ${yoe} years in production. Strong distributed systems intuition from debugging real incidents. Can own a system from design to on-call.`,
      honest_gaps: `${stack.includes('Rust') ? 'Rust is newer for me — 1 year, not yet comfortable with lifetimes in complex cases.' : 'Less experience with ML systems.'} Have not managed engineers yet — aiming for tech lead role, not management.`,
      remote_preference: 'flexible',
      preferred_company_stage: [companyStage],
      preferred_team_size: 'small',
      preferred_engineering_culture: 'high-autonomy, high-ownership, strong technical culture',
      management_style_preference: 'async-first, clear technical direction, minimal bureaucracy',
      target_roles: [spec.role_title, `Staff ${spec.role_title.replace('Senior ', '')}`],
      target_industries: [spec.company_idx === 0 ? 'fintech' : spec.company_idx === 1 ? 'developer tools' : 'healthtech', 'b2b saas'],
      comp_min: spec.comp_band_min - 10000 + (idx % 3) * 5000,
      comp_max: spec.comp_band_min + 30000 + (idx % 3) * 8000,
      open_to_equity: true,
      visa_sponsorship_required: false,
      available_start: idx % 3 === 0 ? 'immediately' : '2 weeks notice' ,
      hard_dealbreakers: 'No pure sysadmin or ops roles. Must involve writing code, not just configuration.',
      next_role_priorities: JSON.stringify(['technical growth', 'ownership', 'team quality', 'compensation']),
      completion_score: 95,
    }
  }

  if (tier === 'medium') {
    const yoe = 3 + (idx % 4)
    const partialStack = stack.slice(0, 2)
    const compHigh = idx % 5 === 0
    return {
      user_id: userId,
      current_title: `Software Engineer`,
      years_of_experience: yoe,
      primary_languages: partialStack,
      frameworks_and_tools: [...partialStack, 'REST APIs', 'Git'],
      cloud_platforms: ['AWS'],
      skill_assessments: Object.fromEntries(partialStack.map((s, i) => [s, { years: yoe - i, self_rating: 7 }])),
      systems_built: [
        {
          name: `${partialStack[0]} REST API Service`,
          description: `Production ${partialStack[0]} service with standard CRUD operations and basic auth`,
          scale: '1k req/day, small team',
          stack: partialStack.join(', '),
          role: 'Contributor, 30% ownership',
        },
        {
          name: 'Internal Dashboard',
          description: 'Admin dashboard for business operations team',
          scale: '50 internal users',
          stack: partialStack[0] + ', PostgreSQL',
          role: 'Primary developer',
        },
        {
          name: 'Data Export Service',
          description: 'CSV/JSON export pipeline for analytics',
          scale: 'Batch processing, daily runs',
          stack: partialStack[0],
          role: 'Sole developer',
        },
      ],
      hardest_problems: [
        {
          problem: `Performance issue in ${partialStack[0]} service causing slow response times`,
          approach: 'Added caching layer and optimized database queries',
          outcome: 'Reduced p95 latency from 800ms to 120ms',
        },
        {
          problem: 'Onboarding onto a legacy codebase with no documentation',
          approach: 'Wrote documentation as I learned, set up linting and basic CI',
          outcome: 'Team onboarding time reduced for next new hire',
        },
      ],
      honest_strengths: `Solid ${partialStack[0]} developer with good fundamentals. Quick learner, good communicator.`,
      honest_gaps: `Limited ${stack[2] ?? stack[1]} experience. Have not worked at scale or led technical design. Still building distributed systems intuition.`,
      remote_preference: idx % 3 === 0 ? 'flexible' : 'hybrid',
      preferred_company_stage: ['any'],
      preferred_team_size: 'medium',
      preferred_engineering_culture: 'collaborative, good mentorship, reasonable pace',
      management_style_preference: 'clear direction, regular 1:1s, growth opportunities',
      target_roles: ['Software Engineer', 'Senior Software Engineer'],
      target_industries: ['saas', 'tech'],
      comp_min: compHigh ? spec.comp_band_max - 10000 : spec.comp_band_min - 20000,
      comp_max: compHigh ? spec.comp_band_max + 40000 : spec.comp_band_max + 10000,
      open_to_equity: true,
      visa_sponsorship_required: false,
      available_start: '1 month',
      hard_dealbreakers: '',
      next_role_priorities: JSON.stringify(['career growth', 'mentorship', 'work-life balance']),
      completion_score: 75,
    }
  }

  // poor
  const wrongStacks = [['Java', 'Spring Boot'], ['PHP', 'Laravel'], ['.NET', 'C#'], ['Ruby on Rails', 'Ruby'], ['Vue.js', 'JavaScript']]
  const ws = wrongStacks[idx % wrongStacks.length]
  const tooJunior = idx % 5 < 2
  const compWayOff = idx % 5 === 2
  const visaRequired = idx % 5 === 3
  const yoe = tooJunior ? 1 + (idx % 2) : 4
  return {
    user_id: userId,
    current_title: tooJunior ? 'Junior Developer' : 'Developer',
    years_of_experience: yoe,
    primary_languages: ws.slice(0, 1),
    frameworks_and_tools: ws,
    cloud_platforms: [],
    skill_assessments: { [ws[0]]: { years: yoe, self_rating: 6 } },
    systems_built: [
      {
        name: `${ws[0]} Web Application`,
        description: `Standard ${ws[0]} CRUD application with user management`,
        scale: 'Small internal tool, < 100 users',
        stack: ws.join(', '),
        role: 'Developer',
      },
      {
        name: 'Blog Platform',
        description: 'Simple CMS-style blog built for learning',
        scale: 'Personal project',
        stack: ws[0],
        role: 'Sole developer',
      },
      {
        name: 'E-commerce Frontend',
        description: 'Shopping cart UI',
        scale: 'Small business, 500 users',
        stack: ws[0] + ', HTML, CSS',
        role: 'Frontend developer',
      },
    ],
    hardest_problems: [
      {
        problem: `Debugging a ${ws[0]} memory issue in production`,
        approach: 'Restarted the server and added more logging',
        outcome: 'Issue resolved, root cause unclear',
      },
      {
        problem: 'Migrating data from one database to another',
        approach: 'Wrote a manual migration script',
        outcome: 'Migration completed with some downtime',
      },
    ],
    honest_strengths: `${ws[0]} development, fast learner, motivated to grow.`,
    honest_gaps: `Limited professional experience. No ${stack[0]} experience. Have not worked on distributed systems.`,
    remote_preference: 'flexible',
    preferred_company_stage: ['any'],
    preferred_team_size: 'any',
    preferred_engineering_culture: 'any',
    management_style_preference: 'any',
    target_roles: ['Developer', 'Software Engineer'],
    target_industries: ['any'],
    comp_min: compWayOff ? spec.comp_band_max + 50000 : 90000,
    comp_max: compWayOff ? spec.comp_band_max + 100000 : 140000,
    open_to_equity: false,
    visa_sponsorship_required: visaRequired,
    available_start: 'immediately',
    hard_dealbreakers: '',
    next_role_priorities: JSON.stringify(['compensation', 'remote work']),
    completion_score: 50,
  }
}

function matchStatusFor(tier: Tier, idx: number): { match_status: string; candidate_confirmation_status: string; company_confirmation_status: string; revealed_at: string | null } {
  if (tier === 'strong') {
    if (idx < 2) return { match_status: 'revealed', candidate_confirmation_status: 'confirmed', company_confirmation_status: 'confirmed', revealed_at: new Date(Date.now() - (7 - idx) * 24 * 60 * 60 * 1000).toISOString() }
    if (idx < 4) return { match_status: 'mutual_confirmed', candidate_confirmation_status: 'confirmed', company_confirmation_status: 'confirmed', revealed_at: null }
    return { match_status: 'candidate_confirmed', candidate_confirmation_status: 'confirmed', company_confirmation_status: 'pending', revealed_at: null }
  }
  if (tier === 'medium') {
    if (idx < 12) return { match_status: 'pending_candidate', candidate_confirmation_status: 'pending', company_confirmation_status: 'pending', revealed_at: null }
    if (idx < 17) return { match_status: 'candidate_confirmed', candidate_confirmation_status: 'confirmed', company_confirmation_status: 'pending', revealed_at: null }
    return { match_status: 'company_confirmed', candidate_confirmation_status: 'pending', company_confirmation_status: 'confirmed', revealed_at: null }
  }
  // poor
  if (idx < 15) return { match_status: 'below_threshold', candidate_confirmation_status: 'pending', company_confirmation_status: 'pending', revealed_at: null }
  return { match_status: 'candidate_dismissed', candidate_confirmation_status: 'dismissed', company_confirmation_status: 'pending', revealed_at: null }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _cachedUsers: any[] | null = null
async function getOrCreateAuthUser(emailAddr: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: emailAddr,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (!error) return data.user!

  // Already exists — look up by email
  if (_cachedUsers === null) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    _cachedUsers = users
  }
  const existing = _cachedUsers.find((u: any) => u.email === emailAddr)
  if (existing) return existing
  throw new Error(`createUser(${emailAddr}): ${error.message}`)
}

async function batchInsert(table: string, rows: object[], batchSize = 50) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(chunk)
    if (error) throw new Error(`insert ${table} batch ${i}: ${error.message}`)
  }
}

function progress(msg: string) {
  process.stdout.write(`  ${msg}\n`)
}

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n═══════════════════════════════════════')
  console.log('  TalentAgent Seed Script')
  console.log('═══════════════════════════════════════\n')

  // ── Step 0: Clean prior seed data ──────────────────────────────────────────
  console.log('Step 0/5: Cleaning prior seed data (job_postings, buyer_agents, company_profiles, matches)...')
  // Delete in dependency order — matches first, then agents/postings, then companies
  await supabase.from('autonomous_matches').delete().eq('match_status', 'below_threshold').gte('created_at', '2020-01-01')
  // Wipe all seeded job postings and buyer agents by source
  await supabase.from('job_postings').delete().eq('source', 'seed')
  // Wipe buyer agents linked to recruiters we control
  const recruiterEmails = RECRUITERS.map(r => r.email)
  const { data: existingRecruiters } = await supabase.from('profiles').select('id').in('email', recruiterEmails)
  const existingRecruiterIds = (existingRecruiters ?? []).map((r: any) => r.id)
  if (existingRecruiterIds.length > 0) {
    await supabase.from('autonomous_matches').delete().in('recruiter_id', existingRecruiterIds)
    await supabase.from('buyer_agents').delete().in('recruiter_id', existingRecruiterIds)
    await supabase.from('company_profiles').delete().in('recruiter_id', existingRecruiterIds)
  }
  progress('✓ Prior seed data cleared')

  // ── Step 1: Recruiters ──────────────────────────────────────────────────────
  console.log('\nStep 1/5: Creating recruiters...')
  const recruiterIds: string[] = []
  for (const r of RECRUITERS) {
    const user = await getOrCreateAuthUser(r.email, r.password, r.full_name)
    const { error } = await supabase.from('profiles').upsert({ id: user.id, email: r.email, full_name: r.full_name, role: 'recruiter' }, { onConflict: 'id' })
    if (error) throw new Error(`profiles upsert ${r.email}: ${error.message}`)
    recruiterIds.push(user.id)
    progress(`✓ ${r.full_name} (${r.email})`)
  }

  // ── Step 2: Company Profiles ────────────────────────────────────────────────
  console.log('\nStep 2/5: Creating company profiles...')
  const companyRows = COMPANIES.map((c, i) => ({
    recruiter_id: recruiterIds[c.recruiter_idx],
    company_name: c.company_name,
    company_website: c.company_website,
    company_size: c.company_size,
    company_stage: c.company_stage,
    industry: c.industry,
    headquarters: c.headquarters,
    founded_year: c.founded_year,
    core_languages: c.core_languages,
    core_frameworks: c.core_frameworks,
    core_infrastructure: c.core_infrastructure,
    core_tools: c.core_tools,
    crm_and_business_tools: c.crm_and_business_tools,
    engineering_values: c.engineering_values,
    engineering_culture: c.engineering_culture,
    deployment_frequency: c.deployment_frequency,
    oncall_expectations: c.oncall_expectations,
    code_review_culture: c.code_review_culture,
    architecture_philosophy: c.architecture_philosophy,
    traits_of_successful_engineers: c.traits_of_successful_engineers,
    traits_that_struggle_here: c.traits_that_struggle_here,
    why_engineers_join: c.why_engineers_join,
    why_engineers_leave: c.why_engineers_leave,
    base_comp_philosophy: c.base_comp_philosophy,
    equity_structure: c.equity_structure,
    health_benefits: c.health_benefits,
    pto_policy: c.pto_policy,
    remote_policy: c.remote_policy,
    learning_and_development: c.learning_and_development,
    other_benefits: c.other_benefits,
    interview_process_overview: c.interview_process_overview,
    typical_timeline: c.typical_timeline,
    interview_stages: JSON.parse(c.interview_stages as string),
    glassdoor_rating: c.glassdoor_rating,
    notable_engineering_blog_url: (c as any).notable_engineering_blog_url ?? null,
    open_source_projects: JSON.parse(c.open_source_projects as string),
    always_emphasize: c.always_emphasize,
    never_misrepresent: c.never_misrepresent,
  }))

  const { data: insertedCompanies, error: compErr } = await supabase.from('company_profiles').insert(companyRows).select('id, company_name')
  if (compErr) throw new Error(`company_profiles insert: ${compErr.message}`)
  const companyIds = insertedCompanies!.map((c: any) => c.id)
  insertedCompanies!.forEach((c: any) => progress(`✓ ${c.company_name}`))

  // ── Step 3: Buyer Agents + Job Postings ─────────────────────────────────────
  console.log('\nStep 3/5: Creating buyer agents and job postings...')
  const agentIds: string[] = []
  const jobPostingIds: string[] = []

  for (let ai = 0; ai < AGENT_SPECS.length; ai++) {
    const spec = AGENT_SPECS[ai]
    const recruiterId = recruiterIds[spec.company_idx]
    const companyId = companyIds[spec.company_idx]
    const company = COMPANIES[spec.company_idx]

    // Create job posting
    const { data: jp, error: jpErr } = await supabase.from('job_postings').insert({
      source: 'seed',
      source_url: `https://${COMPANIES[spec.company_idx].company_website}/jobs/${spec.role_title.toLowerCase().replace(/\s+/g, '-')}`,
      source_job_id: `seed-${spec.company_idx}-${ai}`,
      title: spec.role_title,
      company_name: company.company_name,
      company_website: company.company_website,
      location: company.headquarters,
      remote_type: spec.company_idx === 1 ? 'remote' : spec.company_idx === 0 ? 'remote' : 'hybrid',
      raw_description: spec.jd,
      parsed_requirements: {
        required_skills: JSON.parse(spec.required_skills as string),
        preferred_skills: JSON.parse(spec.preferred_skills as string),
        years_experience: spec.years_experience_min,
        comp_min: spec.comp_band_min,
        comp_max: spec.comp_band_max,
        remote_type: spec.company_idx === 1 ? 'remote' : 'hybrid',
        visa_sponsorship: false,
        seniority: 'senior',
      },
      is_active: true,
      posted_at: new Date().toISOString(),
    }).select('id').single()
    if (jpErr) throw new Error(`job_postings insert ai=${ai}: ${jpErr.message}`)
    jobPostingIds.push(jp!.id)

    // Create buyer agent
    const { data: agent, error: agentErr } = await supabase.from('buyer_agents').insert({
      recruiter_id: recruiterId,
      company_profile_id: companyId,
      company_name: company.company_name,
      role_title: spec.role_title,
      job_description: spec.jd,
      why_last_candidates_failed: spec.why_last_candidates_failed,
      what_hiring_manager_actually_cares_about: spec.what_hiring_manager_actually_cares_about,
      team_dynamics: spec.team_dynamics,
      hidden_dealbreakers: spec.hidden_dealbreakers,
      actual_remote_flexibility: spec.actual_remote_flexibility,
      comp_band_min: spec.comp_band_min,
      comp_band_max: spec.comp_band_max,
      required_skills: JSON.parse(spec.required_skills as string),
      preferred_skills: JSON.parse(spec.preferred_skills as string),
      years_experience_min: spec.years_experience_min,
      years_experience_max: spec.years_experience_max,
      status: 'active',
    }).select('id').single()
    if (agentErr) throw new Error(`buyer_agents insert ai=${ai}: ${agentErr.message}`)
    agentIds.push(agent!.id)

    progress(`✓ ${company.company_name} — ${spec.role_title}`)
  }

  // ── Step 4: Candidates + Matches ────────────────────────────────────────────
  console.log('\nStep 4/5: Creating candidates and matches (300 users)...')
  const sampleCandidateLogins: Array<{ email: string; password: string; name: string; tier: string; agent: string }> = []
  let globalNameIdx = 0
  let totalCreated = 0

  const TIERS: Array<{ tier: Tier; count: number }> = [
    { tier: 'strong', count: 5 },
    { tier: 'medium', count: 20 },
    { tier: 'poor', count: 25 },
  ]

  for (let ai = 0; ai < AGENT_SPECS.length; ai++) {
    const spec = AGENT_SPECS[ai]
    const agentId = agentIds[ai]
    const jobPostingId = jobPostingIds[ai]
    const recruiterId = recruiterIds[spec.company_idx]
    process.stdout.write(`  Agent ${ai + 1}/6 (${spec.role_title}): `)

    let tierIdx = 0
    for (const { tier, count } of TIERS) {
      // Create auth users for this tier in batches of 10
      for (let i = 0; i < count; i++) {
        const { first, last, full } = nameAt(globalNameIdx)
        const userEmail = email(first, last, globalNameIdx)
        globalNameIdx++

        const user = await getOrCreateAuthUser(userEmail, CANDIDATE_PASSWORD, full)
        const userId = user.id

        // Collect sample logins (first 5 candidates = strong matches for agent 1)
        if (ai === 0 && tier === 'strong' && sampleCandidateLogins.length < 5) {
          sampleCandidateLogins.push({ email: userEmail, password: CANDIDATE_PASSWORD, name: full, tier: 'strong', agent: `${COMPANIES[spec.company_idx].company_name} — ${spec.role_title}` })
        }

        const profile = buildCandidateProfile(tier, spec, i, userId)
        const fingerprint = buildGithubFingerprint(tier, spec, i)
        const fitReport = buildFitReport(tier, i, spec)
        const scores = computeScores(tier, i, spec)
        const statuses = matchStatusFor(tier, tierIdx)
        tierIdx++

        // Profiles
        await supabase.from('profiles').upsert({ id: userId, email: userEmail, full_name: full, role: 'candidate' }, { onConflict: 'id' })

        // Candidate profiles
        const { error: cpErr } = await supabase.from('candidate_profiles').upsert(profile, { onConflict: 'user_id' })
        if (cpErr) throw new Error(`candidate_profiles upsert (${userEmail}): ${cpErr.message}`)

        // GitHub profiles
        await supabase.from('github_profiles').upsert({
          user_id: userId,
          github_username: `${first.toLowerCase()}-${last.toLowerCase()}${globalNameIdx}`,
          public_repos_count: tier === 'strong' ? 25 + i * 3 : tier === 'medium' ? 10 + i : 3 + i,
          followers: tier === 'strong' ? 80 + i * 15 : tier === 'medium' ? 15 + i * 3 : 2 + i,
          following: tier === 'strong' ? 45 : 20,
          account_created_at: new Date(Date.now() - (3 + i % 4) * 365 * 24 * 60 * 60 * 1000).toISOString(),
          last_active_at: new Date(Date.now() - (tier === 'strong' ? 2 : tier === 'medium' ? 14 : 60) * 24 * 60 * 60 * 1000).toISOString(),
          technical_fingerprint: fingerprint,
          repos_analyzed: tier === 'strong' ? 20 : tier === 'medium' ? 8 : 3,
          ingestion_status: 'complete',
          ingestion_completed_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        // Autonomous match
        await supabase.from('autonomous_matches').insert({
          candidate_id: userId,
          job_posting_id: jobPostingId,
          buyer_agent_id: agentId,
          recruiter_id: recruiterId,
          overall_fit_score: scores.overall,
          technical_fit_score: scores.technical,
          role_fit_score: scores.role,
          github_evidence_score: scores.github,
          fit_report: fitReport,
          recommendation: scores.recommendation,
          recommendation_summary: scores.recommendation_summary,
          match_status: statuses.match_status,
          candidate_confirmation_status: statuses.candidate_confirmation_status,
          company_confirmation_status: statuses.company_confirmation_status,
          revealed_at: statuses.revealed_at,
        })

        totalCreated++
      }
      process.stdout.write(`${tier}(${count}) `)
    }
    process.stdout.write('\n')
  }

  // ── Step 5: Print summary ────────────────────────────────────────────────────
  console.log('\nStep 5/5: Done!\n')

  console.log('═══════════════════════════════════════')
  console.log('  SEED COMPLETE — LOGIN CREDENTIALS')
  console.log('═══════════════════════════════════════\n')

  console.log('RECRUITERS (password for all: Recruiter123!)\n')
  RECRUITERS.forEach((r, i) => {
    const agents = AGENT_SPECS.filter(a => a.company_idx === i)
    console.log(`  ${r.full_name}`)
    console.log(`  Email:    ${r.email}`)
    console.log(`  Company:  ${COMPANIES[i].company_name} (${COMPANIES[i].company_stage}, ${COMPANIES[i].company_size})`)
    console.log(`  Agents:   ${agents.map(a => a.role_title).join(', ')}`)
    console.log()
  })

  console.log('─────────────────────────────────────────')
  console.log('MATCH COUNTS PER AGENT\n')
  AGENT_SPECS.forEach((spec, ai) => {
    console.log(`  ${COMPANIES[spec.company_idx].company_name} — ${spec.role_title}`)
    console.log(`    Strong (80-100): 5  |  Medium (50-79): 20  |  Poor (0-49): 25  |  Total: 50`)
  })

  console.log('\n─────────────────────────────────────────')
  console.log('MATCH STATUS BREAKDOWN (per agent)\n')
  console.log('  Strong:  2 revealed, 2 mutual_confirmed, 1 candidate_confirmed')
  console.log('  Medium:  12 pending_candidate, 5 candidate_confirmed, 3 company_confirmed')
  console.log('  Poor:    15 below_threshold, 10 candidate_dismissed')

  console.log('\n─────────────────────────────────────────')
  console.log('SAMPLE CANDIDATE LOGINS (password for all: Candidate123!)\n')
  sampleCandidateLogins.forEach(c => {
    console.log(`  ${c.name} — ${c.tier} match`)
    console.log(`  Email:  ${c.email}`)
    console.log(`  Agent:  ${c.agent}`)
    console.log()
  })

  console.log('─────────────────────────────────────────')
  console.log(`Total users created: ${3 + totalCreated} (3 recruiters + ${totalCreated} candidates)`)
  console.log('Total matches created:', totalCreated)
  console.log('═══════════════════════════════════════\n')
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})

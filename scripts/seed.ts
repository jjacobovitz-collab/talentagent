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
    return { requirement: skill, verdict: status, evidence, confidence: tier === 'strong' ? 'high' : tier === 'medium' ? 'medium' : 'low', notes: '' }
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

  const visaRequired = tier === 'poor' && idx % 5 === 3
  return {
    overall_fit_score: scores.overall,
    technical_fit_score: scores.technical,
    role_fit_score: scores.role,
    github_evidence_score: scores.github,
    recommendation: scores.recommendation,
    recommendation_summary: scores.recommendation_summary,
    requirements,
    green_flags: greenFlags,
    yellow_flags: yellowFlags.map((f: any) => ({ ...f, suggested_question: f.flag ? `Can you walk me through your experience with ${f.flag.toLowerCase()}?` : undefined })),
    red_flags: redFlags.map((f: any, ri: number) => ({
      flag: f.flag,
      severity: tier === 'poor' ? (ri === 0 ? 'dealbreaker' : 'significant') : 'minor',
      reasoning: f.flag,
    })),
    compensation_alignment: {
      aligned: tier === 'strong' || (tier === 'medium' && idx % 5 !== 0),
      notes: tier === 'strong' ? 'Within band' : tier === 'medium' && idx % 5 === 0 ? 'Expectations slightly above band max' : 'Expectations well above band',
    },
    visa_flag: visaRequired,
    questions_for_human_screen: screenQuestions,
  }
}

// ─── Candidate Profile Builder ───────────────────────────────────────────────

// Detect which of the 6 specialization archetypes this spec maps to
type SpecType = 'fintech-backend' | 'fintech-fullstack' | 'devtools-staff' | 'platform' | 'healthcare-backend' | 'data-engineer'

function getSpecType(spec: typeof AGENT_SPECS[0]): SpecType {
  if (spec.company_idx === 0 && spec.strong_stack[0] === 'Python') return 'fintech-backend'
  if (spec.strong_stack[0] === 'React') return 'fintech-fullstack'
  if (spec.strong_stack[0] === 'TypeScript') return 'devtools-staff'
  if (spec.strong_stack[0] === 'Go') return 'platform'
  if (spec.strong_stack[0] === 'Java') return 'healthcare-backend'
  return 'data-engineer'
}

function buildGithubFingerprint(tier: Tier, spec: typeof AGENT_SPECS[0], idx: number): { fingerprint: any; repos: any[] } {
  const specType = getSpecType(spec)
  const v = idx % 3 // 0/1/2 variation within tier

  // ── Poor tier: wrong stack, mismatched candidate ──────────────────────────
  if (tier === 'poor') {
    const wrongStacks: Record<SpecType, { lang: string; fw: string; repo1: string; repo2: string; desc: string }> = {
      'fintech-backend':    { lang: 'PHP',    fw: 'Laravel', repo1: 'php-ecommerce-site', repo2: 'laravel-blog', desc: 'PHP/Laravel web developer. No Python, Go, or distributed systems experience visible in GitHub.' },
      'fintech-fullstack':  { lang: 'Java',   fw: 'Spring',  repo1: 'spring-mvc-app', repo2: 'java-crud-api', desc: 'Java/Spring backend developer with no frontend experience. No TypeScript or React visible.' },
      'devtools-staff':     { lang: 'Ruby',   fw: 'Rails',   repo1: 'rails-saas-app', repo2: 'ruby-scripts', desc: 'Ruby/Rails web developer. No TypeScript, Rust, or CLI tooling experience evident.' },
      'platform':           { lang: 'Python', fw: 'Django',  repo1: 'django-web-app', repo2: 'flask-api', desc: 'Python web developer. No Go, Kubernetes, or infrastructure-as-code experience visible.' },
      'healthcare-backend': { lang: 'PHP',    fw: 'WordPress', repo1: 'wordpress-plugin', repo2: 'php-cms', desc: 'PHP/WordPress developer. No Java, Spring Boot, or healthcare systems experience.' },
      'data-engineer':      { lang: 'JavaScript', fw: 'React', repo1: 'react-dashboard', repo2: 'node-express-api', desc: 'JavaScript/React frontend developer. No Python data engineering or cloud pipeline experience.' },
    }
    const ws = wrongStacks[specType]
    const stars1 = 3 + idx
    const stars2 = 1 + idx
    const repos = [
      { repo_name: ws.repo1, primary_language: ws.lang, stars: stars1, claude_analysis: { technical_depth_score: 2 + (idx % 2), what_it_does: `Standard ${ws.fw} CRUD application with basic user authentication and data management.` } },
      { repo_name: ws.repo2, primary_language: ws.lang, stars: stars2, claude_analysis: { technical_depth_score: 2, what_it_does: `Simple ${ws.lang} scripts and utilities, mostly tutorial-level code with no production context.` } },
    ]
    const fingerprint = {
      primary_languages: [
        { language: ws.lang, estimated_proficiency: 'intermediate', proficiency_evidence: `${ws.repo1} and ${ws.repo2} show ${ws.lang} use but at CRUD application level with no production-grade patterns.`, production_evidence: false, repo_count: 2 + (idx % 3), recency: 'older' },
        { language: ws.fw,   estimated_proficiency: 'beginner',     proficiency_evidence: `Framework usage limited to scaffolded tutorials. No evidence of custom architecture.`, production_evidence: false, repo_count: 1, recency: 'older' },
      ],
      frameworks_detected: [
        { name: ws.fw, evidence_repos: [ws.repo1], confidence: 'high', usage_depth: 'surface' },
      ],
      code_quality_signals: {
        documentation_quality: 'poor', documentation_evidence: `${ws.repo1}: no README beyond scaffolded template. No inline documentation found.`,
        test_coverage_signals: 'none', test_evidence: `No test files detected in either repository.`,
        commit_message_quality: 'poor', commit_evidence: `Commit messages limited to "update", "fix", "initial commit". No structured commit discipline.`,
        code_organization: 'poor', organization_evidence: `Single-directory file layout in ${ws.repo1}. No modular structure.`,
        overall_quality_score: 2 + (idx % 2),
      },
      skill_trajectory: {
        direction: 'consistent',
        evidence: `Last commit ${30 + idx * 5} days ago. Activity sporadic — averaging less than 2 commits per month over the last year.`,
        notable_recent_work: `Minor updates to ${ws.repo2}. No new projects started in the last 6 months.`,
      },
      standout_projects: [],
      collaboration_signals: {
        open_source_contributions: 'none', contribution_evidence: 'No pull requests to external repositories found.',
        pr_quality: 'insufficient_data', pr_evidence: 'No open source PRs to evaluate.',
      },
      honest_gaps: [
        `No ${spec.strong_stack[0]} code found in any public repository.`,
        'No distributed systems or scalable architecture patterns visible.',
        'All projects appear to be tutorial or learning exercises, not production work.',
        'No evidence of cloud platform usage (AWS, GCP, or Azure).',
      ],
      red_flags: [
        `Primary language (${ws.lang}) is a significant mismatch with role requirements.`,
        `Commit activity suggests part-time or hobbyist engagement rather than professional development.`,
      ],
      summary: ws.desc,
      seniority_estimate: 'junior',
      seniority_evidence: `Repositories show CRUD application development without complexity. ${1 + (idx % 2)} years implied experience from GitHub account history.`,
      strongest_use_case: `${ws.lang} web application development at small scale. Not suited for distributed backend roles.`,
      overall_github_strength: 2 + (idx % 2),
      confidence_in_assessment: 'high',
    }
    return { fingerprint, repos }
  }

  // ── Strong and medium builds per specialization ───────────────────────────

  const isStrong = tier === 'strong'
  const yoe = isStrong ? 6 + (idx % 4) : 3 + (idx % 3)
  const ghStrength = isStrong ? 8 + (idx % 3) : 5 + (idx % 3)
  const qualityScore = isStrong ? 8 + (v % 2) : 5 + (v % 3)
  const trajectory = isStrong ? (['improving', 'consistent', 'improving'] as const)[v] : (['consistent', 'mixed', 'consistent'] as const)[v]

  if (specType === 'fintech-backend') {
    // Python/Go/Kafka payments backend
    const repos = isStrong ? [
      { repo_name: 'payment-gateway-service', primary_language: 'Python', stars: 94 + idx * 11, claude_analysis: { technical_depth_score: 9, what_it_does: 'High-throughput payment processing microservice handling card authorization, fraud scoring, and ledger writes at 8k TPS with sub-5ms p99.' } },
      { repo_name: 'kafka-consumer-framework', primary_language: 'Python', stars: 67 + idx * 8, claude_analysis: { technical_depth_score: 8, what_it_does: 'Reusable Kafka consumer framework with exactly-once semantics, dead-letter queuing, and Prometheus metrics. Used internally by 3 teams.' } },
      { repo_name: 'go-rate-limiter', primary_language: 'Go', stars: 43 + idx * 6, claude_analysis: { technical_depth_score: 7, what_it_does: 'Redis-backed distributed rate limiter implemented in Go using token bucket algorithm. Deployed as a sidecar in production.' } },
      { repo_name: 'pg-schema-migrator', primary_language: 'Python', stars: 28 + idx * 3, claude_analysis: { technical_depth_score: 7, what_it_does: 'Zero-downtime PostgreSQL migration tool using dual-write patterns. Built to handle live payment databases.' } },
      { repo_name: 'fastapi-auth-middleware', primary_language: 'Python', stars: 19 + idx * 2, claude_analysis: { technical_depth_score: 6, what_it_does: 'Reusable FastAPI middleware for JWT validation, API key management, and request tracing.' } },
    ] : [
      { repo_name: 'fastapi-rest-service', primary_language: 'Python', stars: 14 + idx * 4, claude_analysis: { technical_depth_score: 5, what_it_does: 'Standard FastAPI REST service with CRUD operations, basic auth, and PostgreSQL integration.' } },
      { repo_name: `python-task-queue-${v}`, primary_language: 'Python', stars: 7 + idx * 2, claude_analysis: { technical_depth_score: 4, what_it_does: 'Celery-based task queue for background job processing. Simple retry logic, no dead-letter handling.' } },
      { repo_name: 'sql-query-builder', primary_language: 'Python', stars: 4 + idx, claude_analysis: { technical_depth_score: 4, what_it_does: 'Lightweight SQL query builder for Python. Covers basic SELECT/INSERT/UPDATE patterns.' } },
    ]
    const fingerprint = {
      primary_languages: isStrong ? [
        { language: 'Python', estimated_proficiency: 'expert', proficiency_evidence: `payment-gateway-service and kafka-consumer-framework show production Python at scale — async patterns, type annotations throughout, sophisticated error handling. ${yoe} years visible.`, production_evidence: true, repo_count: 12 + v, recency: 'active' },
        { language: 'Go',     estimated_proficiency: 'advanced', proficiency_evidence: `go-rate-limiter shows idiomatic Go with goroutine-safe Redis client usage, proper context handling, and benchmarks. Not just tutorial code.`, production_evidence: true, repo_count: 4 + v, recency: 'active' },
        { language: 'SQL',    estimated_proficiency: 'advanced', proficiency_evidence: `pg-schema-migrator contains non-trivial DDL migration logic. Commit messages reference query optimization and index tuning.`, production_evidence: true, repo_count: 3, recency: 'recent' },
      ] : [
        { language: 'Python', estimated_proficiency: 'intermediate', proficiency_evidence: `fastapi-rest-service shows solid Python fundamentals and FastAPI patterns, but limited evidence of high-concurrency or production-scale design.`, production_evidence: true, repo_count: 6 + v, recency: 'active' },
        { language: 'SQL',    estimated_proficiency: 'intermediate', proficiency_evidence: `sql-query-builder covers basic patterns. No evidence of complex query optimization or large-scale migrations.`, production_evidence: false, repo_count: 2, recency: 'recent' },
      ],
      frameworks_detected: isStrong ? [
        { name: 'FastAPI',    evidence_repos: ['payment-gateway-service', 'fastapi-auth-middleware'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Kafka',      evidence_repos: ['kafka-consumer-framework', 'payment-gateway-service'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Redis',      evidence_repos: ['go-rate-limiter', 'payment-gateway-service'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'PostgreSQL', evidence_repos: ['pg-schema-migrator', 'payment-gateway-service'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Docker',     evidence_repos: ['payment-gateway-service', 'go-rate-limiter'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'GitHub Actions', evidence_repos: ['payment-gateway-service', 'kafka-consumer-framework'], confidence: 'high', usage_depth: 'moderate' },
      ] : [
        { name: 'FastAPI',    evidence_repos: ['fastapi-rest-service'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'Celery',     evidence_repos: [`python-task-queue-${v}`], confidence: 'high', usage_depth: 'surface' },
        { name: 'PostgreSQL', evidence_repos: ['fastapi-rest-service'], confidence: 'medium', usage_depth: 'surface' },
      ],
      code_quality_signals: {
        documentation_quality: isStrong ? 'excellent' : 'fair',
        documentation_evidence: isStrong ? `payment-gateway-service has a detailed README with architecture diagram, deployment guide, and runbook. fastapi-auth-middleware has full API reference docs.` : `fastapi-rest-service has basic README but no architecture docs. Inline comments sparse.`,
        test_coverage_signals: isStrong ? 'strong' : 'minimal',
        test_evidence: isStrong ? `kafka-consumer-framework has 94% coverage via pytest. Includes integration tests using TestContainers for Kafka and PostgreSQL.` : `fastapi-rest-service has basic unit tests covering happy paths only. No integration tests.`,
        commit_message_quality: isStrong ? 'excellent' : 'fair',
        commit_evidence: isStrong ? `Consistent conventional commits format: "feat(payments): add idempotency key deduplication layer". PR descriptions include motivation and rollout plan.` : `Mostly descriptive but inconsistent. Mix of "fix bug" and more detailed messages.`,
        code_organization: isStrong ? 'excellent' : 'good',
        organization_evidence: isStrong ? `payment-gateway-service uses clean layered architecture (handlers/services/repositories). Domain boundaries well-defined. Dependency injection throughout.` : `fastapi-rest-service follows standard MVC structure. Some logic leaks between layers.`,
        overall_quality_score: qualityScore,
      },
      skill_trajectory: {
        direction: trajectory,
        evidence: isStrong ? `Commit frequency increasing over last 12 months. Recently added Go projects alongside Python, indicating stack expansion. payment-gateway-service shows significantly more architectural sophistication than earlier repos.` : `Steady commit history over last ${8 + v} months. No major new projects started recently. Skills appear stable rather than actively growing.`,
        notable_recent_work: isStrong ? `Building go-rate-limiter as a standalone library — shows shift toward infrastructure-grade components beyond application code.` : `Incremental improvements to fastapi-rest-service. Added basic authentication in last quarter.`,
      },
      standout_projects: isStrong ? [
        { name: 'payment-gateway-service', url: `https://github.com/seed-user-${idx}/payment-gateway-service`, description: 'High-throughput Python payment processing service handling card authorization and ledger writes at 8k TPS with sub-5ms p99 latency.', why_notable: 'Demonstrates production-grade distributed systems thinking: idempotency keys, dual-write patterns for zero-downtime migration, circuit breakers, and Kafka-based event sourcing. Not tutorial-level code.', technical_depth_score: 9, most_relevant_for_roles: ['senior-backend', 'staff-engineer', 'payments-engineer'] },
        { name: 'kafka-consumer-framework', url: `https://github.com/seed-user-${idx}/kafka-consumer-framework`, description: 'Reusable Python framework for Kafka consumers with exactly-once semantics, dead-letter queuing, and built-in Prometheus metrics.', why_notable: 'Designed as an internal library used by multiple teams — shows ability to build shared infrastructure, not just application code. Exactly-once semantic implementation is non-trivial.', technical_depth_score: 8, most_relevant_for_roles: ['senior-backend', 'platform-engineer', 'data-engineer'] },
      ] : [],
      collaboration_signals: {
        open_source_contributions: isStrong ? 'moderate' : 'minimal',
        contribution_evidence: isStrong ? `${3 + v} merged PRs to FastAPI and SQLAlchemy repositories. PRs include bug fixes and documentation improvements.` : `1 merged PR to a small Python utility library. No regular contribution pattern.`,
        pr_quality: isStrong ? 'excellent' : 'fair',
        pr_evidence: isStrong ? `PR descriptions in own repos include problem statement, solution approach, and test coverage notes. Follows conventional commit format.` : `PR descriptions are brief. Test coverage mentioned but inconsistently.`,
      },
      honest_gaps: isStrong ? [
        v === 0 ? 'No Rust or systems-level programming visible — all work is application-layer Python and Go.' : 'Limited frontend experience — purely backend and infrastructure code.',
        'ML/AI integrations not visible in GitHub — fraud detection referenced in commit messages but no ML code committed.',
      ] : [
        `No Go repositories — ${spec.strong_stack[1]} experience not verifiable from GitHub alone.`,
        'No event streaming or Kafka usage visible. Distributed systems knowledge appears theoretical.',
        'Test coverage limited. Integration tests absent from all repositories.',
        'No infrastructure-as-code or deployment configuration visible.',
      ],
      red_flags: isStrong ? [] : [
        `Missing ${spec.strong_stack[1]} evidence — role requires ${spec.strong_stack[1]} proficiency that is not verifiable from GitHub.`,
        v === 0 ? 'All repositories appear to be personal/side projects with no evidence of production deployment.' : 'Limited commit volume suggests part-time engagement.',
      ],
      summary: isStrong
        ? `Strong Python/Go backend engineer with clear evidence of production-grade distributed systems work. payment-gateway-service alone demonstrates Kafka, Redis, PostgreSQL, and zero-downtime migration patterns at real scale. ${yoe} years of active GitHub history shows consistent professional-grade development.`
        : `Competent Python developer with solid REST API fundamentals. Demonstrates good FastAPI knowledge but missing the distributed systems and Kafka experience the role requires. ${yoe} years experience but limited evidence of high-scale production work.`,
      seniority_estimate: isStrong ? (idx < 2 ? 'staff' : 'senior') : 'mid',
      seniority_evidence: isStrong ? `payment-gateway-service architecture complexity and kafka-consumer-framework library design both indicate senior+ thinking. ${yoe} years verified through account history.` : `Good individual contributor skills but no evidence of technical leadership or system design at scale.`,
      strongest_use_case: isStrong ? 'Senior or Staff backend engineer at a fintech or high-scale startup. Best fit for roles that need Python/Go combined with Kafka and PostgreSQL at production scale.' : 'Mid-level backend engineer at a growth-stage company. Would need ramp time on distributed systems.',
      overall_github_strength: ghStrength,
      confidence_in_assessment: 'high',
    }
    return { fingerprint, repos }
  }

  if (specType === 'fintech-fullstack') {
    // React/TypeScript/Go fullstack
    const repos = isStrong ? [
      { repo_name: 'fintech-dashboard-ui', primary_language: 'TypeScript', stars: 88 + idx * 10, claude_analysis: { technical_depth_score: 9, what_it_does: 'Real-time financial dashboard in React with WebSocket-driven portfolio updates, complex D3 charting, and optimistic UI patterns. Handles 500+ concurrent data streams.' } },
      { repo_name: 'go-financial-api',     primary_language: 'Go',         stars: 56 + idx * 7,  claude_analysis: { technical_depth_score: 8, what_it_does: 'Go REST API with JWT auth, rate limiting, and PostgreSQL. Powers the fintech dashboard frontend. Includes OpenAPI spec and generated TypeScript client.' } },
      { repo_name: 'react-data-grid',      primary_language: 'TypeScript', stars: 71 + idx * 9,  claude_analysis: { technical_depth_score: 7, what_it_does: 'Virtualized data grid component for large financial datasets. Handles 100k+ row rendering with column sorting, filtering, and inline editing.' } },
      { repo_name: 'ts-api-codegen',       primary_language: 'TypeScript', stars: 34 + idx * 4,  claude_analysis: { technical_depth_score: 7, what_it_does: 'CLI tool that generates type-safe TypeScript API clients from OpenAPI specs. Eliminates handwritten fetch wrappers.' } },
    ] : [
      { repo_name: 'react-dashboard',      primary_language: 'TypeScript', stars: 18 + idx * 3, claude_analysis: { technical_depth_score: 5, what_it_does: 'Standard React admin dashboard with charts, data tables, and CRUD forms. Uses Recharts for visualization.' } },
      { repo_name: 'express-rest-api',     primary_language: 'TypeScript', stars: 9 + idx * 2,  claude_analysis: { technical_depth_score: 4, what_it_does: 'Node.js/Express REST API with TypeScript. Basic CRUD with JWT auth. No advanced patterns.' } },
      { repo_name: `portfolio-site-${v}`,  primary_language: 'TypeScript', stars: 3 + idx,       claude_analysis: { technical_depth_score: 3, what_it_does: 'Personal portfolio site built with Next.js and Tailwind CSS.' } },
    ]
    const fingerprint = {
      primary_languages: isStrong ? [
        { language: 'TypeScript', estimated_proficiency: 'expert', proficiency_evidence: `fintech-dashboard-ui and react-data-grid show advanced TypeScript: conditional types, mapped types, discriminated unions. Not just type annotations — genuine type-level programming.`, production_evidence: true, repo_count: 9 + v, recency: 'active' },
        { language: 'Go',         estimated_proficiency: 'advanced', proficiency_evidence: `go-financial-api shows idiomatic Go: interface-driven design, context propagation, graceful shutdown. Clean separation of concerns across packages.`, production_evidence: true, repo_count: 3 + v, recency: 'active' },
        { language: 'CSS',        estimated_proficiency: 'advanced', proficiency_evidence: `fintech-dashboard-ui shows sophisticated responsive layouts and animation. Custom Tailwind configuration with design token system.`, production_evidence: true, repo_count: 4, recency: 'active' },
      ] : [
        { language: 'TypeScript', estimated_proficiency: 'intermediate', proficiency_evidence: `react-dashboard uses TypeScript throughout with interfaces and basic generics. Type system usage is conventional rather than advanced.`, production_evidence: true, repo_count: 5 + v, recency: 'active' },
        { language: 'JavaScript', estimated_proficiency: 'intermediate', proficiency_evidence: `Earlier repos use plain JS. TypeScript adoption visible in more recent work.`, production_evidence: false, repo_count: 3, recency: 'recent' },
      ],
      frameworks_detected: isStrong ? [
        { name: 'React',          evidence_repos: ['fintech-dashboard-ui', 'react-data-grid'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Next.js',        evidence_repos: ['fintech-dashboard-ui'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Go',             evidence_repos: ['go-financial-api'], confidence: 'high', usage_depth: 'deep' },
        { name: 'D3.js',          evidence_repos: ['fintech-dashboard-ui'], confidence: 'high', usage_depth: 'deep' },
        { name: 'PostgreSQL',     evidence_repos: ['go-financial-api'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'WebSockets',     evidence_repos: ['fintech-dashboard-ui'], confidence: 'high', usage_depth: 'moderate' },
      ] : [
        { name: 'React',          evidence_repos: ['react-dashboard'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'Node.js/Express', evidence_repos: ['express-rest-api'], confidence: 'high', usage_depth: 'surface' },
        { name: 'Recharts',       evidence_repos: ['react-dashboard'], confidence: 'high', usage_depth: 'surface' },
      ],
      code_quality_signals: {
        documentation_quality: isStrong ? 'good' : 'fair',
        documentation_evidence: isStrong ? `react-data-grid has Storybook stories for all component variants plus a detailed props reference. go-financial-api has OpenAPI spec committed alongside code.` : `react-dashboard has a basic README. No component documentation or Storybook.`,
        test_coverage_signals: isStrong ? 'moderate' : 'minimal',
        test_evidence: isStrong ? `react-data-grid has Jest + React Testing Library tests for core interactions. go-financial-api has ~70% coverage with table-driven tests.` : `express-rest-api has basic unit tests for utility functions only. Frontend untested.`,
        commit_message_quality: isStrong ? 'good' : 'fair',
        commit_evidence: isStrong ? `Conventional commits used consistently. PRs have clear scope descriptions and reference issues.` : `Mix of detailed and vague commits. No consistent format.`,
        code_organization: isStrong ? 'excellent' : 'good',
        organization_evidence: isStrong ? `fintech-dashboard-ui uses feature-based folder structure with co-located tests. Custom hooks abstract all data-fetching complexity.` : `react-dashboard uses standard Create React App structure with some custom organization.`,
        overall_quality_score: qualityScore,
      },
      skill_trajectory: {
        direction: trajectory,
        evidence: isStrong ? `ts-api-codegen (created 4 months ago) shows new interest in developer tooling — expanding beyond application code. Commit velocity has increased 40% over last 6 months.` : `Steady work on react-dashboard over last year. No major new projects or stack exploration visible.`,
        notable_recent_work: isStrong ? `ts-api-codegen — building TypeScript code generation tooling. Suggests interest in developer infrastructure beyond product code.` : `Adding chart components to react-dashboard. Incremental feature additions.`,
      },
      standout_projects: isStrong ? [
        { name: 'fintech-dashboard-ui', url: `https://github.com/seed-user-${idx}/fintech-dashboard-ui`, description: 'Real-time financial dashboard handling 500+ concurrent WebSocket data streams with complex D3 charting and optimistic UI patterns.', why_notable: 'Real-time state synchronization at this complexity is genuinely hard. The combination of WebSocket management, optimistic updates, and D3 in TypeScript shows senior-level frontend architecture skills.', technical_depth_score: 9, most_relevant_for_roles: ['senior-fullstack', 'frontend-engineer', 'fintech-engineer'] },
        { name: 'react-data-grid', url: `https://github.com/seed-user-${idx}/react-data-grid`, description: 'Virtualized data grid component handling 100k+ row rendering with sorting, filtering, and inline editing.', why_notable: 'Virtualization at this scale requires deep React performance knowledge. 71+ stars suggests external adoption, validating production quality.', technical_depth_score: 7, most_relevant_for_roles: ['senior-frontend', 'senior-fullstack', 'ui-engineer'] },
      ] : [],
      collaboration_signals: {
        open_source_contributions: isStrong ? 'moderate' : 'none',
        contribution_evidence: isStrong ? `${2 + v} merged PRs to React Query and Recharts. Contributions focus on TypeScript type improvements.` : 'No pull requests to external repositories found.',
        pr_quality: isStrong ? 'good' : 'insufficient_data',
        pr_evidence: isStrong ? `Own repository PRs include screenshots of UI changes and performance benchmark comparisons.` : 'No external PRs to evaluate.',
      },
      honest_gaps: isStrong ? [
        'No mobile (React Native) work visible.',
        v === 0 ? 'Limited backend infrastructure work — strong on application layer but not systems design.' : 'No GraphQL usage visible despite being common in financial dashboards.',
      ] : [
        'No Go repositories — backend experience is Node.js only. Role requires Go.',
        'No evidence of high-scale real-time features (WebSockets, streaming).',
        'TypeScript usage is basic — no advanced type-level programming.',
      ],
      red_flags: isStrong ? [] : [
        'No Go experience visible. Role requires Go backend proficiency.',
        v === 0 ? 'Frontend-only background with limited full-stack evidence.' : 'Limited production deployment evidence.',
      ],
      summary: isStrong
        ? `Strong full-stack engineer with exceptional React/TypeScript depth and solid Go backend skills. fintech-dashboard-ui demonstrates real-time data handling complexity that goes well beyond typical dashboard work. ${yoe} years of consistent GitHub activity with increasing sophistication.`
        : `Solid React/TypeScript frontend developer with basic Node.js backend skills. Missing the Go proficiency and real-time data handling experience the role requires. Good fundamentals but limited production complexity.`,
      seniority_estimate: isStrong ? 'senior' : 'mid',
      seniority_evidence: isStrong ? `react-data-grid library with 71+ external stars indicates senior-level quality. go-financial-api shows full ownership of backend design.` : `Good individual contributor skills. No technical leadership or library authorship.`,
      strongest_use_case: isStrong ? 'Senior full-stack engineer at a fintech or data-intensive product company. Strong in React with real-time data requirements.' : 'Mid-level frontend or full-stack role. Would need support on backend architecture.',
      overall_github_strength: ghStrength,
      confidence_in_assessment: 'high',
    }
    return { fingerprint, repos }
  }

  if (specType === 'devtools-staff') {
    // TypeScript/Rust SDK and CLI developer
    const repos = isStrong ? [
      { repo_name: 'ts-plugin-system', primary_language: 'TypeScript', stars: 312 + idx * 18, claude_analysis: { technical_depth_score: 10, what_it_does: 'Open-source TypeScript plugin system with hot reloading, sandboxed execution, and a typed hook API. Used by 3,000+ projects on npm.' } },
      { repo_name: 'rust-wasm-parser',  primary_language: 'Rust',       stars: 189 + idx * 14, claude_analysis: { technical_depth_score: 9,  what_it_does: 'Zero-copy WASM binary parser in Rust compiled to WebAssembly. 40x faster than the equivalent JS implementation.' } },
      { repo_name: 'type-safe-rpc',     primary_language: 'TypeScript', stars: 147 + idx * 11, claude_analysis: { technical_depth_score: 8,  what_it_does: 'End-to-end type-safe RPC framework for TypeScript using inferred types from server definitions — no code generation step.' } },
      { repo_name: 'cli-builder-rs',    primary_language: 'Rust',       stars: 96 + idx * 9,   claude_analysis: { technical_depth_score: 8,  what_it_does: 'Ergonomic Rust CLI builder framework with automatic shell completion, progress bars, and structured error reporting.' } },
      { repo_name: 'node-module-graph', primary_language: 'TypeScript', stars: 54 + idx * 6,   claude_analysis: { technical_depth_score: 7,  what_it_does: 'TypeScript module dependency graph analyzer. Used for dead code elimination and bundle optimization.' } },
    ] : [
      { repo_name: 'typescript-sdk-starter', primary_language: 'TypeScript', stars: 22 + idx * 4, claude_analysis: { technical_depth_score: 5, what_it_does: 'Opinionated TypeScript SDK starter template with ESM/CJS dual output, type declarations, and CI setup.' } },
      { repo_name: `node-cli-tool-${v}`,      primary_language: 'TypeScript', stars: 11 + idx * 2, claude_analysis: { technical_depth_score: 4, what_it_does: 'Node.js CLI tool built with Commander.js. Automates local development workflow tasks.' } },
      { repo_name: 'rust-learning',           primary_language: 'Rust',       stars: 5 + idx,       claude_analysis: { technical_depth_score: 3, what_it_does: 'Learning exercises in Rust — Rustlings solutions and small utility programs. Not production code.' } },
    ]
    const fingerprint = {
      primary_languages: isStrong ? [
        { language: 'TypeScript', estimated_proficiency: 'expert', proficiency_evidence: `ts-plugin-system demonstrates advanced TypeScript: conditional types with infer, template literal types, mapped types for plugin API surface. type-safe-rpc shows genuine type-level programming not just annotations.`, production_evidence: true, repo_count: 11 + v, recency: 'active' },
        { language: 'Rust',       estimated_proficiency: 'advanced', proficiency_evidence: `rust-wasm-parser and cli-builder-rs show production Rust: lifetime management, custom allocators in wasm-parser, zero-copy design. Not LeetCode Rust — real systems work.`, production_evidence: true, repo_count: 5 + v, recency: 'active' },
        { language: 'JavaScript', estimated_proficiency: 'expert', proficiency_evidence: `Underlying JavaScript/Node.js depth visible in ts-plugin-system sandbox implementation and module-graph V8 integration.`, production_evidence: true, repo_count: 3, recency: 'recent' },
      ] : [
        { language: 'TypeScript', estimated_proficiency: 'intermediate', proficiency_evidence: `typescript-sdk-starter shows good TypeScript structure but conventional usage. No advanced type-level programming visible.`, production_evidence: false, repo_count: 6 + v, recency: 'active' },
        { language: 'Rust',       estimated_proficiency: 'beginner', proficiency_evidence: `rust-learning is explicitly a learning repository — Rustlings exercises. No production Rust found. Role requires shipped Rust code.`, production_evidence: false, repo_count: 1, recency: 'recent' },
      ],
      frameworks_detected: isStrong ? [
        { name: 'Node.js',   evidence_repos: ['ts-plugin-system', 'type-safe-rpc', 'node-module-graph'], confidence: 'high', usage_depth: 'deep' },
        { name: 'tokio',     evidence_repos: ['cli-builder-rs', 'rust-wasm-parser'], confidence: 'high', usage_depth: 'deep' },
        { name: 'WebAssembly', evidence_repos: ['rust-wasm-parser'], confidence: 'high', usage_depth: 'deep' },
        { name: 'esbuild',   evidence_repos: ['node-module-graph'], confidence: 'medium', usage_depth: 'moderate' },
        { name: 'GitHub Actions', evidence_repos: ['ts-plugin-system', 'cli-builder-rs'], confidence: 'high', usage_depth: 'moderate' },
      ] : [
        { name: 'Node.js',   evidence_repos: ['typescript-sdk-starter', `node-cli-tool-${v}`], confidence: 'high', usage_depth: 'moderate' },
        { name: 'Commander.js', evidence_repos: [`node-cli-tool-${v}`], confidence: 'high', usage_depth: 'surface' },
      ],
      code_quality_signals: {
        documentation_quality: isStrong ? 'excellent' : 'good',
        documentation_evidence: isStrong ? `ts-plugin-system has a full documentation site generated from JSDoc. type-safe-rpc README includes interactive TypeScript Playground links demonstrating type inference.` : `typescript-sdk-starter has a well-structured README with API reference. Missing advanced usage examples.`,
        test_coverage_signals: isStrong ? 'strong' : 'minimal',
        test_evidence: isStrong ? `ts-plugin-system has 96% coverage with both unit and integration tests across Node versions (16, 18, 20). cli-builder-rs uses property-based testing with proptest.` : `typescript-sdk-starter has basic unit tests. CLI tool is untested.`,
        commit_message_quality: isStrong ? 'excellent' : 'good',
        commit_evidence: isStrong ? `All commits follow conventional commits with scoped messages. PRs link to RFC documents. ts-plugin-system has a CHANGELOG automatically generated from commits.` : `Descriptive commit messages but no consistent format. No automated changelog.`,
        code_organization: isStrong ? 'excellent' : 'good',
        organization_evidence: isStrong ? `ts-plugin-system uses monorepo structure (pnpm workspaces) with clear package boundaries. Rust code uses workspace members with shared utilities factored into crates.` : `typescript-sdk-starter follows standard TypeScript library structure. Sensible but not sophisticated.`,
        overall_quality_score: qualityScore,
      },
      skill_trajectory: {
        direction: trajectory,
        evidence: isStrong ? `rust-wasm-parser (6 months old) shows deliberate expansion into Rust/WASM territory. Commit complexity and repo star counts have increased consistently over 3 years.` : `typescript-sdk-starter shows some maturation from earlier JavaScript work. rust-learning suggests Rust exploration but not yet production-ready.`,
        notable_recent_work: isStrong ? `rust-wasm-parser — pushing into WASM compilation and zero-copy binary parsing. This is frontier work for a TypeScript-primarily developer.` : `Working through Rust learning materials. Has not yet shipped anything in Rust.`,
      },
      standout_projects: isStrong ? [
        { name: 'ts-plugin-system', url: `https://github.com/seed-user-${idx}/ts-plugin-system`, description: 'Open-source TypeScript plugin system with hot reloading and sandboxed execution used by 3,000+ npm packages.', why_notable: '312+ stars and 3k+ dependents proves production quality. Sandboxed hot-reloading is technically non-trivial. This is the kind of work that builds a reputation in the JS/TS ecosystem.', technical_depth_score: 10, most_relevant_for_roles: ['staff-engineer', 'sdk-engineer', 'developer-tools'] },
        { name: 'rust-wasm-parser', url: `https://github.com/seed-user-${idx}/rust-wasm-parser`, description: 'Zero-copy WASM binary parser in Rust, compiled to WebAssembly, 40x faster than equivalent JS implementation.', why_notable: 'Demonstrates genuine Rust expertise (lifetimes, allocators, zero-copy) and WASM compilation pipeline knowledge. 189+ stars shows community recognition.', technical_depth_score: 9, most_relevant_for_roles: ['staff-engineer', 'systems-engineer', 'developer-tools'] },
      ] : [],
      collaboration_signals: {
        open_source_contributions: isStrong ? 'significant' : 'minimal',
        contribution_evidence: isStrong ? `${8 + v} merged PRs to TypeScript compiler (microsoft/TypeScript), ${3 + v} to deno. Known contributor to the broader TypeScript tooling ecosystem.` : `1 merged PR to a small TypeScript utility library. No pattern of OSS engagement.`,
        pr_quality: isStrong ? 'excellent' : 'fair',
        pr_evidence: isStrong ? `PRs to TypeScript repo include detailed technical rationale, edge case analysis, and updated specification text. High engineering bar.` : 'Limited external PRs to evaluate.',
      },
      honest_gaps: isStrong ? [
        'No distributed systems or backend service architecture visible — work is entirely tooling and libraries.',
        v === 0 ? 'Limited Go code despite it being commonly paired with Rust in systems work.' : 'No gRPC usage despite being common in SDK tooling.',
      ] : [
        'Rust experience is learning-phase only. Role requires shipped production Rust code.',
        'No open source presence of note. Role specifically values OSS contributions.',
        'SDK design experience limited to starter templates, not shipped SDKs.',
        'CLI tooling experience is script-level, not framework-level.',
      ],
      red_flags: isStrong ? [] : [
        'Rust experience is explicitly learning-phase. Role requires production Rust — this is a hard requirement.',
        'No meaningful open source contributions. Staff-level role at devtools company values ecosystem presence.',
      ],
      summary: isStrong
        ? `Exceptional TypeScript/Rust engineer with a strong open-source presence. ts-plugin-system (312 stars, 3k+ dependents) demonstrates production SDK design skills at a level that influences the ecosystem. Rust work (rust-wasm-parser) shows genuine systems-level thinking beyond web application development. ${yoe} years of increasing sophistication.`
        : `Solid TypeScript developer exploring Rust but not yet production-ready in it. Good SDK packaging instincts but missing the Rust depth and open-source track record the Staff role requires.`,
      seniority_estimate: isStrong ? (idx < 2 ? 'principal' : 'staff') : 'senior',
      seniority_evidence: isStrong ? `ts-plugin-system ecosystem impact (3k+ dependents) and TypeScript compiler contributions indicate principal/staff level. Multiple repos with 100+ stars show consistent quality over time.` : `Individual contributor skills are solid but no evidence of the ecosystem impact or technical leadership expected at Staff level.`,
      strongest_use_case: isStrong ? 'Staff or Principal engineer at a developer tools company building SDKs, CLIs, or language tooling.' : 'Senior TypeScript engineer at a product company. Would need Rust skill development to qualify for developer tools staff roles.',
      overall_github_strength: ghStrength,
      confidence_in_assessment: 'high',
    }
    return { fingerprint, repos }
  }

  if (specType === 'platform') {
    // Go/Kubernetes platform engineer
    const repos = isStrong ? [
      { repo_name: 'k8s-build-operator',   primary_language: 'Go', stars: 127 + idx * 14, claude_analysis: { technical_depth_score: 9, what_it_does: 'Kubernetes operator for managing ephemeral build worker pods. Implements custom scheduling, resource quotas, and preemption logic using controller-runtime.' } },
      { repo_name: 'argocd-build-plugin',  primary_language: 'Go', stars: 84 + idx * 9,   claude_analysis: { technical_depth_score: 8, what_it_does: 'ArgoCD config management plugin that integrates build artifact provenance into GitOps deployment pipelines.' } },
      { repo_name: 'terraform-k8s-modules', primary_language: 'HCL', stars: 61 + idx * 7,  claude_analysis: { technical_depth_score: 7, what_it_does: 'Production-ready Terraform modules for Kubernetes cluster provisioning on GCP and AWS with opinionated networking and RBAC defaults.' } },
      { repo_name: 'prometheus-build-exporter', primary_language: 'Go', stars: 38 + idx * 5, claude_analysis: { technical_depth_score: 7, what_it_does: 'Custom Prometheus exporter that surfaces build queue depth, worker utilization, and cache hit rates as metrics.' } },
    ] : [
      { repo_name: 'helm-chart-templates', primary_language: 'YAML', stars: 16 + idx * 3, claude_analysis: { technical_depth_score: 4, what_it_does: 'Collection of Helm chart templates for common Kubernetes workload patterns (Deployment, StatefulSet, CronJob) with sensible defaults.' } },
      { repo_name: `go-k8s-client-demo-${v}`, primary_language: 'Go', stars: 8 + idx * 2, claude_analysis: { technical_depth_score: 4, what_it_does: 'Demo application using the Kubernetes client-go library to list and watch resources. Learning-oriented code.' } },
      { repo_name: 'terraform-aws-snippets', primary_language: 'HCL', stars: 5 + idx,     claude_analysis: { technical_depth_score: 3, what_it_does: 'Personal collection of Terraform AWS resource snippets for common patterns. No module structure.' } },
    ]
    const fingerprint = {
      primary_languages: isStrong ? [
        { language: 'Go',      estimated_proficiency: 'expert', proficiency_evidence: `k8s-build-operator and argocd-build-plugin show expert Go: controller-runtime reconciliation loop patterns, informer caches, admission webhooks, proper use of context/cancellation. This is not tutorial Go.`, production_evidence: true, repo_count: 8 + v, recency: 'active' },
        { language: 'HCL',     estimated_proficiency: 'advanced', proficiency_evidence: `terraform-k8s-modules shows module design patterns, for_each abstractions, and output chaining that indicates production Terraform experience.`, production_evidence: true, repo_count: 3 + v, recency: 'active' },
        { language: 'Python',  estimated_proficiency: 'intermediate', proficiency_evidence: `Several utility scripts for operational tasks. Not primary language but functional.`, production_evidence: false, repo_count: 2, recency: 'recent' },
      ] : [
        { language: 'Go',   estimated_proficiency: 'intermediate', proficiency_evidence: `go-k8s-client-demo shows basic client-go usage — listing resources, basic watchers. No controller-runtime or operator patterns visible.`, production_evidence: false, repo_count: 3 + v, recency: 'active' },
        { language: 'YAML', estimated_proficiency: 'intermediate', proficiency_evidence: `helm-chart-templates shows solid Helm knowledge but templating is conventional. No custom admission webhooks or operators.`, production_evidence: false, repo_count: 4, recency: 'recent' },
      ],
      frameworks_detected: isStrong ? [
        { name: 'controller-runtime', evidence_repos: ['k8s-build-operator'], confidence: 'high', usage_depth: 'deep' },
        { name: 'client-go',    evidence_repos: ['k8s-build-operator', 'argocd-build-plugin'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Terraform',    evidence_repos: ['terraform-k8s-modules'], confidence: 'high', usage_depth: 'deep' },
        { name: 'ArgoCD',       evidence_repos: ['argocd-build-plugin'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Prometheus',   evidence_repos: ['prometheus-build-exporter'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'Helm',         evidence_repos: ['k8s-build-operator'], confidence: 'high', usage_depth: 'moderate' },
      ] : [
        { name: 'Helm',         evidence_repos: ['helm-chart-templates'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'client-go',    evidence_repos: [`go-k8s-client-demo-${v}`], confidence: 'high', usage_depth: 'surface' },
        { name: 'Terraform',    evidence_repos: ['terraform-aws-snippets'], confidence: 'medium', usage_depth: 'surface' },
      ],
      code_quality_signals: {
        documentation_quality: isStrong ? 'excellent' : 'fair',
        documentation_evidence: isStrong ? `k8s-build-operator has full operator installation guide, CRD reference, and troubleshooting runbook. terraform-k8s-modules includes input/output variable documentation and architecture diagram.` : `helm-chart-templates has README but no architecture context. Individual chart documentation missing.`,
        test_coverage_signals: isStrong ? 'strong' : 'minimal',
        test_evidence: isStrong ? `k8s-build-operator uses envtest for controller integration tests with fake Kubernetes API server. prometheus-build-exporter has metric correctness unit tests.` : `go-k8s-client-demo has no tests. helm-chart-templates has basic lint checks only.`,
        commit_message_quality: isStrong ? 'good' : 'fair',
        commit_evidence: isStrong ? `Commit messages reference Kubernetes issues and include rollback considerations for operator changes. Clear distinction between feature, fix, and refactor commits.` : `Mix of clear and vague commit messages. No consistent format.`,
        code_organization: isStrong ? 'excellent' : 'fair',
        organization_evidence: isStrong ? `k8s-build-operator follows kubebuilder project layout with controllers, webhooks, and API types cleanly separated. Internal packages clearly scoped.` : `go-k8s-client-demo is a flat main package structure. No evidence of production-grade organization.`,
        overall_quality_score: qualityScore,
      },
      skill_trajectory: {
        direction: trajectory,
        evidence: isStrong ? `argocd-build-plugin (3 months old) shows expansion from platform operations into GitOps integration tooling. prometheus-build-exporter shows metrics-first thinking — observability is built in, not added later.` : `Steady accumulation of Helm/Terraform snippets but no architectural progression. go-k8s-client-demo has not been updated in ${3 + v} months.`,
        notable_recent_work: isStrong ? `argocd-build-plugin — integrating build provenance into GitOps workflows. This is cutting-edge platform engineering territory.` : `Adding more Helm chart templates. No new architectural work.`,
      },
      standout_projects: isStrong ? [
        { name: 'k8s-build-operator', url: `https://github.com/seed-user-${idx}/k8s-build-operator`, description: 'Kubernetes operator managing ephemeral build worker pods with custom scheduling, resource quotas, and preemption logic.', why_notable: 'Writing a Kubernetes operator with custom scheduling logic is a high bar — requires deep controller-runtime, admission webhook, and informer cache knowledge. 127+ stars indicates external adoption. This is the "has written a controller" signal the role requires.', technical_depth_score: 9, most_relevant_for_roles: ['platform-engineer', 'staff-engineer', 'kubernetes-engineer'] },
        { name: 'prometheus-build-exporter', url: `https://github.com/seed-user-${idx}/prometheus-build-exporter`, description: 'Custom Prometheus exporter surfacing build queue depth, worker utilization, and cache hit rates.', why_notable: 'Shows observability-first platform thinking — instrumenting internal systems for operational insight rather than just building the system.', technical_depth_score: 7, most_relevant_for_roles: ['platform-engineer', 'sre', 'devops-engineer'] },
      ] : [],
      collaboration_signals: {
        open_source_contributions: isStrong ? 'moderate' : 'minimal',
        contribution_evidence: isStrong ? `${3 + v} merged PRs to kubernetes-sigs/controller-runtime. ${2 + v} PRs to ArgoCD community. Active in Kubernetes Slack.` : `1 PR to helm/charts for a documentation fix. No ongoing engagement.`,
        pr_quality: isStrong ? 'excellent' : 'insufficient_data',
        pr_evidence: isStrong ? `PRs to controller-runtime include test cases demonstrating the edge case being fixed. High-quality contributions that pass maintainer review.` : `Insufficient external PRs to evaluate quality.`,
      },
      honest_gaps: isStrong ? [
        'No application-layer service development visible — purely infrastructure and tooling.',
        v === 0 ? 'No eBPF work despite it becoming central to modern platform engineering.' : 'Limited multi-cloud evidence — work appears GCP-primary.',
      ] : [
        'No Kubernetes operator development visible. Role requires controller-runtime expertise, not just kubectl/Helm usage.',
        'Terraform experience appears to be snippet collection, not production module design.',
        'Go proficiency is basic — no evidence of idiomatic patterns or production-scale code.',
        'No CI/CD pipeline ownership or ArgoCD experience visible.',
      ],
      red_flags: isStrong ? [] : [
        'go-k8s-client-demo is learning-level code, not production operator development. Role specifically requires written operators.',
        v === 0 ? 'Kubernetes experience appears administrative (Helm charts) rather than engineering (controllers, operators).' : 'Limited Go depth — role requires Go proficiency for operator development.',
      ],
      summary: isStrong
        ? `Expert Kubernetes platform engineer with clear evidence of operator development, not just cluster administration. k8s-build-operator (127+ stars) demonstrates controller-runtime depth that distinguishes a platform software engineer from a DevOps admin. ${yoe} years of Go/Kubernetes work visible in GitHub history.`
        : `Kubernetes administrator with basic Go skills. Helm chart templates and client-go demos show familiarity with the ecosystem but not the software engineering depth to build operators or controllers. Missing the key signal the role requires.`,
      seniority_estimate: isStrong ? 'senior' : 'mid',
      seniority_evidence: isStrong ? `k8s-build-operator complexity (custom scheduling, preemption, admission webhooks) indicates senior-level platform engineering. ${yoe} years verified.` : `Good understanding of Kubernetes patterns but no evidence of designing or owning production operators.`,
      strongest_use_case: isStrong ? 'Senior platform engineer at a company running significant Kubernetes infrastructure who needs to build custom operators and controllers, not just operate clusters.' : 'DevOps or platform role focused on Helm and Terraform configuration management.',
      overall_github_strength: ghStrength,
      confidence_in_assessment: 'high',
    }
    return { fingerprint, repos }
  }

  if (specType === 'healthcare-backend') {
    // Java/Spring/HIPAA backend
    const repos = isStrong ? [
      { repo_name: 'fhir-r4-api-server',     primary_language: 'Java',   stars: 74 + idx * 9, claude_analysis: { technical_depth_score: 9, what_it_does: 'FHIR R4-compliant REST API server built on Spring Boot with full audit logging, role-based access control, and SMART on FHIR authorization.' } },
      { repo_name: 'hipaa-audit-spring-boot', primary_language: 'Java',   stars: 52 + idx * 7, claude_analysis: { technical_depth_score: 8, what_it_does: 'Spring Boot starter library for HIPAA-compliant audit logging. Intercepts PHI access automatically via AOP and writes to tamper-evident audit trail.' } },
      { repo_name: 'ehr-kafka-connector',     primary_language: 'Java',   stars: 38 + idx * 5, claude_analysis: { technical_depth_score: 7, what_it_does: 'Kafka Connect connector for streaming HL7 v2 messages from EHR systems. Includes a schema transformer that normalizes to FHIR R4 format.' } },
      { repo_name: 'clinical-data-testkit',   primary_language: 'Java',   stars: 29 + idx * 4, claude_analysis: { technical_depth_score: 7, what_it_does: 'Test utilities for FHIR-based Java services: synthetic PHI generators, FHIR resource validators, and TestContainers setup for clinical databases.' } },
    ] : [
      { repo_name: 'spring-boot-crud-api',  primary_language: 'Java', stars: 12 + idx * 2, claude_analysis: { technical_depth_score: 4, what_it_does: 'Standard Spring Boot CRUD API with JPA, basic JWT authentication, and Swagger documentation.' } },
      { repo_name: `java-rest-service-${v}`, primary_language: 'Java', stars: 6 + idx,       claude_analysis: { technical_depth_score: 4, what_it_does: 'Java REST service following standard MVC patterns. No domain-specific complexity.' } },
      { repo_name: 'junit5-samples',         primary_language: 'Java', stars: 3 + idx,       claude_analysis: { technical_depth_score: 3, what_it_does: 'JUnit 5 test examples covering common patterns. Reference code rather than production service.' } },
    ]
    const fingerprint = {
      primary_languages: isStrong ? [
        { language: 'Java',   estimated_proficiency: 'expert', proficiency_evidence: `fhir-r4-api-server and hipaa-audit-spring-boot show expert Java: Spring Security OAuth2, AOP interceptors, JPA entity graphs, custom validators. Complex domain — not generic CRUD.`, production_evidence: true, repo_count: 10 + v, recency: 'active' },
        { language: 'SQL',    estimated_proficiency: 'advanced', proficiency_evidence: `fhir-r4-api-server commit history includes non-trivial PostgreSQL query optimization and partitioned table DDL. PHI handling visible in migration comments.`, production_evidence: true, repo_count: 3, recency: 'active' },
        { language: 'Python', estimated_proficiency: 'intermediate', proficiency_evidence: `Several Python utility scripts for data pipeline tasks. Not primary language but functional.`, production_evidence: false, repo_count: 2, recency: 'recent' },
      ] : [
        { language: 'Java', estimated_proficiency: 'intermediate', proficiency_evidence: `spring-boot-crud-api and java-rest-service show solid Java/Spring fundamentals. Standard MVC patterns with JPA. No domain complexity or advanced Spring features.`, production_evidence: true, repo_count: 5 + v, recency: 'active' },
        { language: 'SQL',  estimated_proficiency: 'beginner', proficiency_evidence: `Basic JPQL queries visible. No raw SQL optimization or complex schema design.`, production_evidence: false, repo_count: 1, recency: 'older' },
      ],
      frameworks_detected: isStrong ? [
        { name: 'Spring Boot',     evidence_repos: ['fhir-r4-api-server', 'hipaa-audit-spring-boot', 'ehr-kafka-connector'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Spring Security', evidence_repos: ['fhir-r4-api-server', 'hipaa-audit-spring-boot'], confidence: 'high', usage_depth: 'deep' },
        { name: 'Kafka Connect',   evidence_repos: ['ehr-kafka-connector'], confidence: 'high', usage_depth: 'deep' },
        { name: 'TestContainers',  evidence_repos: ['clinical-data-testkit', 'fhir-r4-api-server'], confidence: 'high', usage_depth: 'deep' },
        { name: 'JPA/Hibernate',   evidence_repos: ['fhir-r4-api-server'], confidence: 'high', usage_depth: 'moderate' },
        { name: 'Kafka',           evidence_repos: ['ehr-kafka-connector'], confidence: 'high', usage_depth: 'moderate' },
      ] : [
        { name: 'Spring Boot', evidence_repos: ['spring-boot-crud-api', `java-rest-service-${v}`], confidence: 'high', usage_depth: 'moderate' },
        { name: 'JPA',         evidence_repos: ['spring-boot-crud-api'], confidence: 'high', usage_depth: 'surface' },
        { name: 'JUnit 5',     evidence_repos: ['junit5-samples'], confidence: 'high', usage_depth: 'surface' },
      ],
      code_quality_signals: {
        documentation_quality: isStrong ? 'excellent' : 'fair',
        documentation_evidence: isStrong ? `fhir-r4-api-server has full OpenAPI 3.0 spec, FHIR conformance statement, and a HIPAA compliance guide. hipaa-audit-spring-boot has integration guide and threat model.` : `spring-boot-crud-api has Swagger UI but no architectural documentation. Inline JavaDoc sparse.`,
        test_coverage_signals: isStrong ? 'strong' : 'minimal',
        test_evidence: isStrong ? `fhir-r4-api-server has 87% coverage using JUnit 5 and TestContainers. clinical-data-testkit provides reusable synthetic PHI for test isolation. Integration tests are first-class, not afterthoughts.` : `junit5-samples shows knowledge of testing patterns but spring-boot-crud-api has only basic unit tests. No integration tests visible.`,
        commit_message_quality: isStrong ? 'excellent' : 'good',
        commit_evidence: isStrong ? `Commits in fhir-r4-api-server reference JIRA tickets, include HIPAA section citations where relevant, and distinguish regulatory from feature changes.` : `Descriptive but generic commit messages. No domain context or regulatory references.`,
        code_organization: isStrong ? 'excellent' : 'good',
        organization_evidence: isStrong ? `fhir-r4-api-server uses hexagonal architecture with clear domain/application/infrastructure layers. PHI handling is isolated to dedicated packages with access tracking.` : `spring-boot-crud-api follows standard layered MVC. No domain modeling beyond simple entities.`,
        overall_quality_score: qualityScore,
      },
      skill_trajectory: {
        direction: trajectory,
        evidence: isStrong ? `ehr-kafka-connector (4 months old) shows expansion into event-driven EHR integration — a more complex domain than REST APIs alone. fhir-r4-api-server commit history shows deepening FHIR spec knowledge over 2+ years.` : `steady Spring Boot work over ${12 + v} months but no evidence of new capabilities or domain expansion.`,
        notable_recent_work: isStrong ? `ehr-kafka-connector — streaming HL7 messages and normalizing to FHIR format. Shows engagement with real healthcare data standards, not just web development patterns.` : `Adding Swagger documentation to existing API endpoints. Maintenance-mode activity.`,
      },
      standout_projects: isStrong ? [
        { name: 'fhir-r4-api-server', url: `https://github.com/seed-user-${idx}/fhir-r4-api-server`, description: 'FHIR R4-compliant REST API server with full audit logging, RBAC, and SMART on FHIR authorization.', why_notable: 'FHIR R4 compliance is non-trivial — the spec is 3,500+ pages and most implementations are partial. SMART on FHIR OAuth2 flow + PHI audit trail shows genuine healthcare domain expertise, not just Java skills.', technical_depth_score: 9, most_relevant_for_roles: ['healthcare-backend', 'fhir-developer', 'senior-backend'] },
        { name: 'hipaa-audit-spring-boot', url: `https://github.com/seed-user-${idx}/hipaa-audit-spring-boot`, description: 'Spring Boot starter that auto-instruments PHI access with HIPAA-compliant audit logging via AOP.', why_notable: 'Building a reusable library rather than in-app audit code shows architectural maturity. AOP-based instrumentation is the right pattern for compliance cross-cutting concerns.', technical_depth_score: 8, most_relevant_for_roles: ['healthcare-backend', 'java-engineer', 'platform-engineer'] },
      ] : [],
      collaboration_signals: {
        open_source_contributions: isStrong ? 'moderate' : 'none',
        contribution_evidence: isStrong ? `${2 + v} merged PRs to hapifhir/hapi-fhir (the main Java FHIR library). Contributions include bug fixes in FHIR R4 resource serialization.` : 'No pull requests to external repositories found.',
        pr_quality: isStrong ? 'good' : 'insufficient_data',
        pr_evidence: isStrong ? `hapi-fhir PRs include failing test cases demonstrating the bug before the fix. Well-received by maintainers.` : 'No external PRs to evaluate.',
      },
      honest_gaps: isStrong ? [
        'No Python data pipeline experience visible — clinical analytics work would require Python/SQL.',
        v === 0 ? 'Limited frontend experience — purely backend Java development.' : 'No microservices mesh tooling (Istio, Consul) visible despite working in a microservices context.',
      ] : [
        'No FHIR or healthcare domain-specific code visible. Role requires healthcare API experience.',
        'Spring Security, Kafka, and advanced Spring features not evident in repositories.',
        'Test coverage is minimal. Role requires strong testing discipline (CareConnect requires 80%+ coverage).',
        'No regulated industry compliance patterns visible (audit logging, PHI access control).',
      ],
      red_flags: isStrong ? [] : [
        `No FHIR or healthcare API experience — this is a domain-specific role where the learning curve matters.`,
        v === 0 ? 'Test coverage appears minimal, which is a significant gap for a regulated healthcare environment.' : 'Limited Spring Security and compliance pattern experience.',
      ],
      summary: isStrong
        ? `Strong Java/Spring healthcare backend engineer with rare FHIR domain expertise. fhir-r4-api-server demonstrates both technical depth (Spring Security, AOP, TestContainers) and domain knowledge (FHIR R4 spec, SMART on FHIR, PHI handling). hipaa-audit-spring-boot shows library design thinking. ${yoe} years of healthcare-focused development visible.`
        : `Competent Java/Spring developer with solid fundamentals but no healthcare-specific experience. Good general backend skills but missing FHIR knowledge, compliance patterns, and the testing discipline required in regulated environments.`,
      seniority_estimate: isStrong ? 'senior' : 'mid',
      seniority_evidence: isStrong ? `fhir-r4-api-server architectural complexity and hipaa-audit-spring-boot library design indicate senior Java engineering. FHIR domain expertise validates healthcare context.` : `Individual contributor-level Java skills. No evidence of technical leadership or complex domain design.`,
      strongest_use_case: isStrong ? 'Senior Java backend engineer at a healthcare or regulated industry company. Best fit for FHIR API development and PHI-handling systems.' : 'Mid-level Java backend role at a non-regulated company where healthcare domain is not required.',
      overall_github_strength: ghStrength,
      confidence_in_assessment: 'high',
    }
    return { fingerprint, repos }
  }

  // specType === 'data-engineer': Python/AWS/Spark/dbt
  const repos = isStrong ? [
    { repo_name: 'clinical-etl-pipeline',     primary_language: 'Python', stars: 68 + idx * 8, claude_analysis: { technical_depth_score: 9, what_it_does: 'PHI-safe EHR data pipeline using PySpark on AWS Glue. Implements k-anonymity for aggregate analytics while preserving individual record privacy.' } },
    { repo_name: 'dbt-healthcare-models',      primary_language: 'SQL',    stars: 51 + idx * 6, claude_analysis: { technical_depth_score: 8, what_it_does: 'dbt model library for clinical data warehouse covering patient encounters, medication records, and lab results with documented lineage.' } },
    { repo_name: 'spark-phi-anonymizer',       primary_language: 'Python', stars: 44 + idx * 5, claude_analysis: { technical_depth_score: 8, what_it_does: 'PySpark library for PHI field detection and anonymization using NLP entity recognition. Handles free-text clinical notes.' } },
    { repo_name: 'data-quality-framework',     primary_language: 'Python', stars: 33 + idx * 4, claude_analysis: { technical_depth_score: 7, what_it_does: 'Great Expectations-based data quality framework with custom clinical validators for FHIR resources and HL7 message schemas.' } },
    { repo_name: 'redshift-optimizer',         primary_language: 'Python', stars: 22 + idx * 3, claude_analysis: { technical_depth_score: 6, what_it_does: 'CLI tool that analyzes Redshift query plans and suggests distribution keys, sort keys, and missing statistics.' } },
  ] : [
    { repo_name: 'pandas-etl-scripts',    primary_language: 'Python', stars: 9 + idx * 2, claude_analysis: { technical_depth_score: 4, what_it_does: 'Collection of pandas ETL scripts for transforming CSV and JSON data into normalized database tables.' } },
    { repo_name: `dbt-project-demo-${v}`, primary_language: 'SQL',    stars: 5 + idx,       claude_analysis: { technical_depth_score: 4, what_it_does: 'Introductory dbt project with basic staging and mart models. Tutorial-level complexity.' } },
    { repo_name: 'aws-s3-utils',          primary_language: 'Python', stars: 3 + idx,       claude_analysis: { technical_depth_score: 3, what_it_does: 'Wrapper utilities for common AWS S3 operations (upload, download, list, copy). No advanced patterns.' } },
  ]
  const fingerprint = {
    primary_languages: isStrong ? [
      { language: 'Python', estimated_proficiency: 'expert', proficiency_evidence: `clinical-etl-pipeline and spark-phi-anonymizer show expert Python: PySpark DataFrame API, custom UDFs, NLP pipeline integration, AWS Glue job scripts. Not script-level Python — production data engineering.`, production_evidence: true, repo_count: 11 + v, recency: 'active' },
      { language: 'SQL',    estimated_proficiency: 'expert', proficiency_evidence: `dbt-healthcare-models contains non-trivial window functions, recursive CTEs for patient encounter hierarchies, and FHIR-aligned data modeling. Redshift-optimizer shows query plan analysis depth.`, production_evidence: true, repo_count: 5 + v, recency: 'active' },
      { language: 'Scala',  estimated_proficiency: 'intermediate', proficiency_evidence: `Several Spark job files written in Scala alongside Python equivalents. Indicates comfort with JVM Spark when needed.`, production_evidence: false, repo_count: 2, recency: 'recent' },
    ] : [
      { language: 'Python', estimated_proficiency: 'intermediate', proficiency_evidence: `pandas-etl-scripts shows solid Python and pandas fundamentals. aws-s3-utils shows basic boto3 usage. No PySpark or distributed processing visible.`, production_evidence: false, repo_count: 5 + v, recency: 'active' },
      { language: 'SQL',    estimated_proficiency: 'intermediate', proficiency_evidence: `dbt-project-demo shows basic dbt patterns (staging, marts). SQL quality is tutorial-level — no window functions or complex joins.`, production_evidence: false, repo_count: 2, recency: 'recent' },
    ],
    frameworks_detected: isStrong ? [
      { name: 'PySpark',           evidence_repos: ['clinical-etl-pipeline', 'spark-phi-anonymizer'], confidence: 'high', usage_depth: 'deep' },
      { name: 'dbt',               evidence_repos: ['dbt-healthcare-models'], confidence: 'high', usage_depth: 'deep' },
      { name: 'AWS Glue',          evidence_repos: ['clinical-etl-pipeline'], confidence: 'high', usage_depth: 'deep' },
      { name: 'Great Expectations', evidence_repos: ['data-quality-framework'], confidence: 'high', usage_depth: 'deep' },
      { name: 'Amazon Redshift',   evidence_repos: ['dbt-healthcare-models', 'redshift-optimizer'], confidence: 'high', usage_depth: 'deep' },
      { name: 'spaCy (NLP)',       evidence_repos: ['spark-phi-anonymizer'], confidence: 'medium', usage_depth: 'moderate' },
    ] : [
      { name: 'pandas',  evidence_repos: ['pandas-etl-scripts'], confidence: 'high', usage_depth: 'moderate' },
      { name: 'dbt',     evidence_repos: [`dbt-project-demo-${v}`], confidence: 'high', usage_depth: 'surface' },
      { name: 'boto3',   evidence_repos: ['aws-s3-utils'], confidence: 'high', usage_depth: 'surface' },
    ],
    code_quality_signals: {
      documentation_quality: isStrong ? 'excellent' : 'fair',
      documentation_evidence: isStrong ? `clinical-etl-pipeline has full data lineage documentation, PHI handling guide, and HIPAA compliance notes. dbt-healthcare-models has column-level descriptions for every model with business context.` : `pandas-etl-scripts has comments in code but no architectural documentation. dbt-project-demo lacks model descriptions.`,
      test_coverage_signals: isStrong ? 'strong' : 'minimal',
      test_evidence: isStrong ? `data-quality-framework has pytest suite testing all custom validators. dbt-healthcare-models has dbt tests on all primary keys, referential integrity, and FHIR code set membership.` : `aws-s3-utils has basic unit tests for utility functions. ETL scripts are untested.`,
      commit_message_quality: isStrong ? 'good' : 'fair',
      commit_evidence: isStrong ? `dbt-healthcare-models commits reference clinical data model decisions and FHIR mapping rationale. clinical-etl-pipeline commits note PHI handling changes explicitly.` : `Generic commit messages like "update scripts" and "fix query". No domain context.`,
      code_organization: isStrong ? 'excellent' : 'fair',
      organization_evidence: isStrong ? `clinical-etl-pipeline uses job/transform/validate layer separation. dbt-healthcare-models follows mature layered modeling (staging, intermediate, marts) with exposure files.` : `pandas-etl-scripts is a flat collection of scripts with no consistent structure.`,
      overall_quality_score: qualityScore,
    },
    skill_trajectory: {
      direction: trajectory,
      evidence: isStrong ? `spark-phi-anonymizer (5 months old) shows expansion into NLP and unstructured clinical text processing — a sophisticated new domain beyond structured pipeline work. Commit frequency consistent.` : `Steady work on pandas ETL scripts. No PySpark, Spark, or cloud-native pipeline experience emerging.`,
      notable_recent_work: isStrong ? `spark-phi-anonymizer — applying NLP entity recognition to free-text clinical notes for PHI detection. Rare intersection of data engineering and clinical informatics.` : `Adding more CSV transformation functions to pandas-etl-scripts. No architectural progression.`,
    },
    standout_projects: isStrong ? [
      { name: 'clinical-etl-pipeline', url: `https://github.com/seed-user-${idx}/clinical-etl-pipeline`, description: 'PHI-safe EHR data pipeline on AWS Glue/PySpark implementing k-anonymity for clinical analytics while preserving individual privacy.', why_notable: 'k-anonymity implementation for clinical data is genuinely hard — requires deep understanding of both privacy theory and clinical data structures. This is the intersection of data engineering and healthcare compliance that makes a data engineer valuable in this space.', technical_depth_score: 9, most_relevant_for_roles: ['senior-data-engineer', 'healthcare-data', 'platform-data-engineer'] },
      { name: 'dbt-healthcare-models', url: `https://github.com/seed-user-${idx}/dbt-healthcare-models`, description: 'dbt model library for clinical data warehouse with full lineage documentation covering patient encounters, medications, and lab results.', why_notable: '51+ stars on a specialized dbt library suggests external adoption by other healthcare data teams. Column-level documentation with business context is rare and signals strong data modeling discipline.', technical_depth_score: 8, most_relevant_for_roles: ['data-engineer', 'analytics-engineer', 'healthcare-data'] },
    ] : [],
    collaboration_signals: {
      open_source_contributions: isStrong ? 'moderate' : 'none',
      contribution_evidence: isStrong ? `${2 + v} merged PRs to dbt-labs/dbt-core for healthcare-related data type handling. ${1 + v} PRs to great-expectations/great_expectations.` : 'No pull requests to external repositories found.',
      pr_quality: isStrong ? 'good' : 'insufficient_data',
      pr_evidence: isStrong ? `dbt-core PRs include data lineage test cases and edge case documentation. Accepted by maintainers without revision.` : 'No external PRs to evaluate.',
    },
    honest_gaps: isStrong ? [
      'No streaming/real-time pipeline work visible — all work is batch-oriented (Glue, Spark).',
      v === 0 ? 'No Kafka or Kinesis stream processing despite being common in healthcare event pipelines.' : 'No ML engineering or feature store work visible.',
    ] : [
      'No PySpark or cloud-native pipeline experience visible. Role requires AWS Glue and PySpark proficiency.',
      'dbt usage is tutorial-level. Production dbt model design requires more sophistication.',
      'No PHI data handling or healthcare-specific pipeline patterns visible.',
      'AWS S3 wrapper shows boto3 familiarity but no Glue, Redshift, or EMR experience.',
    ],
    red_flags: isStrong ? [] : [
      'No PySpark or distributed processing — role requires AWS Glue/Spark. pandas-only profile is a significant gap.',
      v === 0 ? 'Clinical data experience entirely absent. Role requires comfort with PHI and healthcare data standards.' : 'dbt usage is introductory. Production healthcare dbt project would be a significant leap.',
    ],
    summary: isStrong
      ? `Strong Python/SQL data engineer with deep PySpark and dbt experience in a healthcare context. clinical-etl-pipeline demonstrates PHI-safe data engineering at a level of sophistication (k-anonymity, NLP-based PHI detection) that is genuinely rare. ${yoe} years of active healthcare data engineering visible.`
      : `Competent Python data engineer with pandas and basic dbt knowledge but missing the PySpark, AWS Glue, and healthcare-specific experience the role requires. Good data engineering foundations but not yet production-ready for clinical data pipelines.`,
    seniority_estimate: isStrong ? 'senior' : 'mid',
    seniority_evidence: isStrong ? `clinical-etl-pipeline complexity and data-quality-framework library design both indicate senior data engineering. Healthcare domain specificity adds valuable differentiation.` : `Solid data engineering fundamentals but limited production pipeline complexity or domain expertise.`,
    strongest_use_case: isStrong ? 'Senior data engineer at a healthcare or regulated data company. Best fit for clinical data warehouse design and PHI-safe analytics pipelines.' : 'Mid-level data engineer at a non-regulated company. Would need significant ramp-up for clinical data roles.',
    overall_github_strength: ghStrength,
    confidence_in_assessment: 'high',
  }
  return { fingerprint, repos }
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
        const { fingerprint, repos: reposList } = buildGithubFingerprint(tier, spec, i)
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
          repos_analyzed: reposList,
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

// Anonymization utilities for the reveal mechanic
// Company and candidate identities are hidden until both sides confirm mutual interest

export function generateCompanyAlias(jobPostingId: string): string {
  const descriptors = [
    'Fast-growing', 'Well-funded', 'Profitable',
    'Early-stage', 'Series B', 'Public', 'Bootstrapped', 'Venture-backed'
  ]
  const industries = [
    'Fintech', 'Dev Tools', 'Infrastructure',
    'Healthcare Tech', 'Enterprise SaaS', 'AI/ML Platform',
    'E-commerce', 'Security', 'Data Platform'
  ]
  const hash = (jobPostingId.charCodeAt(0) || 0) + (jobPostingId.charCodeAt(1) || 0)
  return `${descriptors[hash % descriptors.length]} ${industries[(hash + 3) % industries.length]}`
}

export function generateCandidateAlias(userId: string): string {
  const levels = ['Mid-level', 'Senior', 'Staff', 'Principal']
  const hash = (userId.charCodeAt(0) || 0) + (userId.charCodeAt(1) || 0)
  return `${levels[hash % levels.length]} Engineer`
}

export function anonymizeLocation(location: string | null): string {
  if (!location) return 'Location not specified'
  const l = location.toLowerCase()
  if (l.includes('san francisco') || l.includes('bay area') || l.includes('sf')) return 'San Francisco Bay Area'
  if (l.includes('new york') || l.includes('nyc')) return 'New York Metro'
  if (l.includes('seattle')) return 'Pacific Northwest'
  if (l.includes('austin')) return 'Texas'
  if (l.includes('boston')) return 'Boston Metro'
  if (l.includes('chicago')) return 'Midwest'
  if (l.includes('los angeles') || l.includes('la ')) return 'Los Angeles'
  if (l.includes('remote')) return 'Remote'
  return 'United States'
}

export function isRevealed(matchStatus: string): boolean {
  return ['revealed', 'mutual_confirmed', 'in_conversation', 'offer_made', 'hired'].includes(matchStatus)
}

export function buildAnonymizedCompanyView(
  jobPosting: any,
  companyProfile: any,
  fitReport: any
): object {
  return {
    company_placeholder: generateCompanyAlias(jobPosting.id),
    company_size: companyProfile?.company_size || 'Not disclosed',
    company_stage: companyProfile?.company_stage || 'Not disclosed',
    industry: jobPosting.parsed_requirements?.industry || companyProfile?.industry || null,
    headquarters_region: anonymizeLocation(jobPosting.location),
    remote_type: jobPosting.parsed_requirements?.remote_type || null,

    role_title: jobPosting.title,
    comp_range: {
      min: jobPosting.parsed_requirements?.comp_min || null,
      max: jobPosting.parsed_requirements?.comp_max || null,
    },
    seniority_level: jobPosting.parsed_requirements?.seniority_level || null,
    tech_stack: jobPosting.parsed_requirements?.tech_stack || [],

    engineering_culture_summary: companyProfile?.engineering_culture
      ? companyProfile.engineering_culture.substring(0, 200)
      : null,
    remote_policy: companyProfile?.remote_policy || null,
    equity_structure: companyProfile?.equity_structure || null,
    pto_policy: companyProfile?.pto_policy || null,

    overall_fit_score: fitReport?.overall_fit_score,
    technical_fit_score: fitReport?.technical_fit_score,
    role_fit_score: fitReport?.role_fit_score,
    recommendation: fitReport?.bilateral_recommendation || fitReport?.recommendation,
    recommendation_summary: fitReport?.recommendation_summary,
    why_you_would_want_this: fitReport?.candidate_assessment?.why_candidate_would_want_this || null,
    why_you_might_not_want_this: fitReport?.candidate_assessment?.why_candidate_might_not_want_this || null,
    green_flags: fitReport?.green_flags || [],
    yellow_flags: fitReport?.yellow_flags || [],
    open_questions: fitReport?.open_questions || [],
    github_evidence: fitReport?.github_evidence_highlights || [],
  }
}

export function buildAnonymizedCandidateView(
  candidateProfile: any,
  githubFingerprint: any,
  fitReport: any
): object {
  return {
    candidate_placeholder: generateCandidateAlias(candidateProfile.user_id),

    years_of_experience: candidateProfile.years_of_experience,
    current_seniority: githubFingerprint?.seniority_estimate || null,

    primary_languages: candidateProfile.primary_languages || candidateProfile.languages || [],
    frameworks_and_tools: candidateProfile.frameworks_and_tools || candidateProfile.frameworks || [],
    github_skill_summary: githubFingerprint?.summary || null,
    standout_projects_anonymized: githubFingerprint?.standout_projects?.map((p: any) => ({
      description: p.description,
      why_notable: p.why_notable,
      technical_depth_score: p.technical_depth_score,
      // No repo names or URLs
    })) || [],

    honest_strengths: candidateProfile.honest_strengths || candidateProfile.genuine_strengths || null,
    honest_gaps: candidateProfile.honest_gaps || candidateProfile.genuine_gaps || null,

    comp_expectation_min: candidateProfile.comp_min,
    comp_expectation_max: candidateProfile.comp_max,
    remote_preference: candidateProfile.remote_preference,
    visa_sponsorship_required: candidateProfile.visa_sponsorship_required || false,
    available_start: candidateProfile.available_start || candidateProfile.availability || null,

    overall_fit_score: fitReport?.overall_fit_score,
    technical_fit_score: fitReport?.technical_fit_score,
    buyer_summary: fitReport?.hiring_team_summary || fitReport?.recommendation_summary,
    buyer_recommendation: fitReport?.buyer_assessment?.buyer_recommendation || fitReport?.recommendation,
    question_assessments: fitReport?.buyer_assessment?.question_assessments || [],
    key_evidence: fitReport?.key_evidence || [],
    open_questions: fitReport?.open_questions || [],
  }
}

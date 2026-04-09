export function detectDocumentType(filename: string, textPreview: string): string {
  const lower = filename.toLowerCase() + ' ' + textPreview.toLowerCase()

  if (lower.includes('culture') || lower.includes('values') || lower.includes('who we are')) {
    return 'culture_deck'
  }
  if (lower.includes('engineering') && (lower.includes('handbook') || lower.includes('guide'))) {
    return 'engineering_handbook'
  }
  if (lower.includes('onboarding') || lower.includes('first day') || lower.includes('welcome to')) {
    return 'onboarding_doc'
  }
  if (lower.includes('careers') || lower.includes('join us') || lower.includes('why work')) {
    return 'careers_page'
  }
  if (lower.includes('job description') || lower.includes('responsibilities') || lower.includes('requirements')) {
    return 'job_posting_template'
  }
  if (lower.includes('slide') || lower.includes('presentation') || lower.includes('.pptx')) {
    return 'slide_deck'
  }
  return 'other'
}

const COMPLETENESS_FIELDS: { field: string; weight: number }[] = [
  { field: 'engineering_values', weight: 3 },
  { field: 'engineering_culture', weight: 3 },
  { field: 'traits_of_successful_engineers', weight: 3 },
  { field: 'traits_that_struggle_here', weight: 3 },
  { field: 'why_engineers_join', weight: 3 },
  { field: 'why_engineers_leave', weight: 3 },
  { field: 'core_languages', weight: 2 },
  { field: 'core_frameworks', weight: 2 },
  { field: 'core_infrastructure', weight: 2 },
  { field: 'remote_policy', weight: 2 },
  { field: 'oncall_expectations', weight: 2 },
  { field: 'deployment_frequency', weight: 2 },
  { field: 'code_review_culture', weight: 2 },
  { field: 'architecture_philosophy', weight: 2 },
  { field: 'base_comp_philosophy', weight: 1 },
  { field: 'equity_structure', weight: 1 },
  { field: 'health_benefits', weight: 1 },
  { field: 'pto_policy', weight: 1 },
  { field: 'learning_and_development', weight: 1 },
  { field: 'interview_process_overview', weight: 1 },
  { field: 'typical_timeline', weight: 1 },
]

export function calculateCompanyProfileCompleteness(profile: Record<string, unknown>): number {
  const maxScore = COMPLETENESS_FIELDS.reduce((sum, f) => sum + f.weight, 0)
  const actualScore = COMPLETENESS_FIELDS.reduce((sum, f) => {
    const value = profile[f.field]
    const hasValue = value && (Array.isArray(value) ? value.length > 0 : String(value).length > 10)
    return sum + (hasValue ? f.weight : 0)
  }, 0)
  return Math.round((actualScore / maxScore) * 100)
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  culture_deck: 'Culture Deck',
  engineering_handbook: 'Engineering Handbook',
  careers_page: 'Careers Page',
  job_posting_template: 'Job Posting Template',
  onboarding_doc: 'Onboarding Document',
  blog_post: 'Blog Post / Article',
  slide_deck: 'Slide Deck',
  other: 'Other',
}

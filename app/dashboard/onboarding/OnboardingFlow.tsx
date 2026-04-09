'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface Props {
  userId: string
  githubProfile: any
  onboardingSession: any
  candidateProfile: any
}

interface StatusData {
  ingestion_status: string | null
  total_repos: number
  repos_selected: number
  repos_complete: number
  repos_in_progress: number
  repo_statuses: { name: string; status: string }[]
}

// -------------------------------------------------------
// Step 1: GitHub Connection
// -------------------------------------------------------

function Step1Connect() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-[#0F172A] rounded-2xl flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#0F172A] mb-3">
          Connect GitHub and your agent gets to work
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          We analyze your repositories to understand what you have actually built. This takes 5-10 minutes.
          While it runs you can start filling in the details your code does not show.
        </p>

        <Link
          href="/api/github/connect"
          className="inline-flex items-center gap-3 bg-[#0F172A] text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-[#1e293b] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          Connect GitHub
        </Link>

        <div className="mt-8 bg-white border border-slate-100 rounded-xl p-5 text-left shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Privacy</p>
          <ul className="space-y-2">
            {[
              'We only read public repositories',
              'We never write to your GitHub',
              'Your code is never stored — only our analysis of it',
              'Disconnect at any time and all data is deleted',
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="text-[#10B981] shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Step 2: Ingestion Progress + Basics Form
// -------------------------------------------------------

function Step2Ingestion({
  githubProfile,
  candidateProfile,
  userId,
  onComplete,
}: {
  githubProfile: any
  candidateProfile: any
  userId: string
  onComplete: () => void
}) {
  const supabase = createClient()
  const [status, setStatus] = useState<StatusData>({
    ingestion_status: githubProfile?.ingestion_status || null,
    total_repos: githubProfile?.public_repos_count || 0,
    repos_selected: 0,
    repos_complete: 0,
    repos_in_progress: 0,
    repo_statuses: [],
  })
  const [feedItems, setFeedItems] = useState<{ text: string; done: boolean }[]>([])
  const [basics, setBasics] = useState({
    current_title: candidateProfile?.current_title || '',
    years_of_experience: candidateProfile?.years_of_experience || '',
    primary_languages: (candidateProfile?.primary_languages || []).join(', '),
    honest_strengths: candidateProfile?.honest_strengths || '',
    honest_gaps: candidateProfile?.honest_gaps || '',
  })
  const ingestStarted = useRef(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Start ingestion if not already running
  useEffect(() => {
    if (!ingestStarted.current && githubProfile && githubProfile.ingestion_status !== 'ingesting' && githubProfile.ingestion_status !== 'complete') {
      ingestStarted.current = true
      fetch('/api/github/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubProfileId: githubProfile.id }),
      }).catch(() => {})
    }
  }, [githubProfile])

  // Build feed items from status
  useEffect(() => {
    const items: { text: string; done: boolean }[] = []

    items.push({ text: 'Discovering your repositories...', done: status.repos_selected > 0 })

    if (status.repos_selected > 0) {
      items.push({
        text: `Found ${status.total_repos} repositories — selecting the most relevant...`,
        done: true
      })
    }

    for (const repo of status.repo_statuses) {
      if (repo.status === 'analyzing' || repo.status === 'complete') {
        items.push({
          text: `Analyzing ${repo.name}...`,
          done: repo.status === 'complete'
        })
      }
    }

    if (status.repos_complete > 0 && status.ingestion_status !== 'complete') {
      items.push({ text: 'Building your technical fingerprint...', done: status.ingestion_status === 'complete' })
    }

    if (status.ingestion_status === 'complete') {
      items.push({
        text: `Done — reviewed ${status.repos_complete} repositories`,
        done: true
      })
    }

    setFeedItems(items)
  }, [status])

  // Poll for status
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/github/status')
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
          if (data.ingestion_status === 'complete') {
            if (pollingRef.current) clearInterval(pollingRef.current)
            setTimeout(onComplete, 1500)
          }
        }
      } catch {}
    }

    poll()
    pollingRef.current = setInterval(poll, 3000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [onComplete])

  const saveBasics = useCallback(async () => {
    const langs = basics.primary_languages
      .split(',')
      .map((l: string) => l.trim())
      .filter(Boolean)

    await supabase.from('candidate_profiles').upsert({
      user_id: userId,
      current_title: basics.current_title,
      years_of_experience: basics.years_of_experience ? parseInt(basics.years_of_experience as string) : null,
      primary_languages: langs,
      honest_strengths: basics.honest_strengths,
      honest_gaps: basics.honest_gaps,
    }, { onConflict: 'user_id' })
  }, [basics, userId, supabase])

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A]">Analyzing your GitHub profile</h1>
          <p className="text-slate-500 mt-1">Fill in the details while we work — your code tells us a lot, but not everything.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Progress feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className={`w-2 h-2 rounded-full ${status.ingestion_status === 'complete' ? 'bg-[#10B981]' : 'bg-[#6366F1] animate-pulse'}`} />
              <span className="text-sm font-medium text-slate-600">
                {status.ingestion_status === 'complete' ? 'Analysis complete' : 'Analysis in progress'}
              </span>
            </div>

            <div className="space-y-3">
              {feedItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-[#10B981]' : 'bg-slate-100'}`}>
                    {item.done ? (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                    )}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-[#0F172A]' : 'text-slate-400'}`}>{item.text}</span>
                </div>
              ))}

              {feedItems.length === 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                  </div>
                  <span className="text-sm text-slate-400">Discovering your repositories...</span>
                </div>
              )}
            </div>

            {status.repos_selected > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Repositories analyzed</span>
                  <span>{status.repos_complete} / {status.repos_selected}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-[#6366F1] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${status.repos_selected > 0 ? (status.repos_complete / status.repos_selected) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Basics form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-4">While you wait — the basics</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current title</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                  placeholder="e.g. Senior Software Engineer"
                  value={basics.current_title}
                  onChange={e => setBasics(b => ({ ...b, current_title: e.target.value }))}
                  onBlur={saveBasics}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Years of experience</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                  placeholder="e.g. 5"
                  value={basics.years_of_experience}
                  onChange={e => setBasics(b => ({ ...b, years_of_experience: e.target.value }))}
                  onBlur={saveBasics}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary languages</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
                  rows={2}
                  placeholder="TypeScript, Python, Go (comma-separated)"
                  value={basics.primary_languages}
                  onChange={e => setBasics(b => ({ ...b, primary_languages: e.target.value }))}
                  onBlur={saveBasics}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Honest strengths</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
                  rows={2}
                  placeholder="What do you genuinely do better than most engineers at your level?"
                  value={basics.honest_strengths}
                  onChange={e => setBasics(b => ({ ...b, honest_strengths: e.target.value }))}
                  onBlur={saveBasics}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Honest gaps</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
                  rows={2}
                  placeholder="What skills are you still developing?"
                  value={basics.honest_gaps}
                  onChange={e => setBasics(b => ({ ...b, honest_gaps: e.target.value }))}
                  onBlur={saveBasics}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Step 3: Fingerprint Review
// -------------------------------------------------------

function FingerprintSection({
  title,
  children,
  fieldPath,
  placeholder,
  onCorrect,
}: {
  title: string
  children: React.ReactNode
  fieldPath: string
  placeholder: string
  onCorrect: (fieldPath: string, context: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [context, setContext] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (context.trim()) {
      onCorrect(fieldPath, context)
      setSaved(true)
      setTimeout(() => { setOpen(false); setSaved(false) }, 1000)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-[#0F172A]">{title}</h3>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs text-[#6366F1] hover:underline shrink-0 ml-4"
        >
          {open ? 'Cancel' : 'Add context'}
        </button>
      </div>
      {children}
      {open && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
            rows={3}
            placeholder={placeholder}
            value={context}
            onChange={e => setContext(e.target.value)}
          />
          <button
            onClick={handleSave}
            className="mt-2 bg-[#6366F1] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
          >
            {saved ? 'Saved!' : 'Save context'}
          </button>
        </div>
      )}
    </div>
  )
}

function Step3Review({
  githubProfile,
  onNext,
}: {
  githubProfile: any
  onNext: () => void
}) {
  const fingerprint = githubProfile?.technical_fingerprint || {}
  const [submitting, setSubmitting] = useState(false)
  const pendingCorrections = useRef<{ field_path: string; context: string; original_value: any; corrected_value: any }[]>([])

  const handleCorrect = (fieldPath: string, context: string) => {
    pendingCorrections.current.push({
      field_path: fieldPath,
      context,
      original_value: null,
      corrected_value: null,
    })
  }

  const handleContinue = async () => {
    setSubmitting(true)
    if (pendingCorrections.current.length > 0) {
      await fetch('/api/github/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: pendingCorrections.current }),
      })
    } else {
      // Mark reviewed even with no corrections
      await fetch('/api/github/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections: [] }),
      })
    }
    setSubmitting(false)
    onNext()
  }

  const proficiencyColor = (p: string) => {
    if (p === 'expert') return 'bg-[#10B981]/10 text-[#10B981]'
    if (p === 'advanced') return 'bg-[#6366F1]/10 text-[#6366F1]'
    if (p === 'intermediate') return 'bg-[#F59E0B]/10 text-[#F59E0B]'
    return 'bg-slate-100 text-slate-500'
  }

  const seniorityColor = (s: string) => {
    if (s === 'principal' || s === 'staff') return 'bg-[#6366F1] text-white'
    if (s === 'senior') return 'bg-[#10B981] text-white'
    if (s === 'mid') return 'bg-[#F59E0B] text-white'
    return 'bg-slate-200 text-slate-700'
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A]">Here is what your agent knows about you</h1>
          <p className="text-slate-500 mt-1">
            Review carefully. Your agent uses this to represent you. Correct anything wrong and add context the code does not show.
          </p>
        </div>

        <div className="space-y-4">
          {/* Primary Languages */}
          <FingerprintSection
            title="Primary Languages"
            fieldPath="primary_languages"
            placeholder="Add context your code does not show about these languages (e.g. production experience not on GitHub)"
            onCorrect={handleCorrect}
          >
            {fingerprint.primary_languages?.length > 0 ? (
              <div className="space-y-3">
                {fingerprint.primary_languages.map((lang: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-[#0F172A]">{lang.language}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${proficiencyColor(lang.estimated_proficiency)}`}>
                          {lang.estimated_proficiency}
                        </span>
                        <span className="text-xs text-slate-400">{lang.recency}</span>
                      </div>
                      <p className="text-xs text-slate-500">{lang.proficiency_evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No languages detected</p>
            )}
          </FingerprintSection>

          {/* Standout Projects */}
          {fingerprint.standout_projects?.length > 0 && (
            <FingerprintSection
              title="Standout Projects"
              fieldPath="standout_projects"
              placeholder="What would you want a recruiter to know about these projects that is not visible in the code?"
              onCorrect={handleCorrect}
            >
              <div className="space-y-4">
                {fingerprint.standout_projects.map((proj: any, i: number) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-[#0F172A]">{proj.name}</span>
                      <span className="text-xs bg-[#6366F1]/10 text-[#6366F1] px-2 py-0.5 rounded-full font-medium">
                        {proj.technical_depth_score}/10
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{proj.description}</p>
                    <p className="text-xs text-slate-500">{proj.why_notable}</p>
                  </div>
                ))}
              </div>
            </FingerprintSection>
          )}

          {/* Code Quality */}
          <FingerprintSection
            title="Code Quality"
            fieldPath="code_quality_signals"
            placeholder="Does this assessment miss anything? Add context."
            onCorrect={handleCorrect}
          >
            {fingerprint.code_quality_signals ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Documentation', value: fingerprint.code_quality_signals.documentation_quality, evidence: fingerprint.code_quality_signals.documentation_evidence },
                  { label: 'Testing', value: fingerprint.code_quality_signals.test_coverage_signals, evidence: fingerprint.code_quality_signals.test_evidence },
                  { label: 'Organization', value: fingerprint.code_quality_signals.code_organization, evidence: fingerprint.code_quality_signals.organization_evidence },
                  { label: 'Commit discipline', value: fingerprint.code_quality_signals.commit_message_quality, evidence: fingerprint.code_quality_signals.commit_evidence },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-slate-500 mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-[#0F172A] capitalize mb-1">{item.value || 'Unknown'}</p>
                    {item.evidence && <p className="text-xs text-slate-400 line-clamp-2">{item.evidence}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No quality signals detected</p>
            )}
          </FingerprintSection>

          {/* Seniority Estimate */}
          <FingerprintSection
            title="Seniority Estimate"
            fieldPath="seniority_estimate"
            placeholder="Tell us why this is wrong — provide evidence from your actual work."
            onCorrect={handleCorrect}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full capitalize ${seniorityColor(fingerprint.seniority_estimate)}`}>
                {fingerprint.seniority_estimate || 'Unknown'}
              </span>
            </div>
            {fingerprint.seniority_evidence && (
              <p className="text-sm text-slate-600">{fingerprint.seniority_evidence}</p>
            )}
          </FingerprintSection>

          {/* Honest Gaps */}
          {fingerprint.honest_gaps?.length > 0 && (
            <FingerprintSection
              title="Honest Gaps"
              fieldPath="honest_gaps"
              placeholder="Are you actively working on any of these gaps? Add context."
              onCorrect={handleCorrect}
            >
              <ul className="space-y-2">
                {fingerprint.honest_gaps.map((gap: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-slate-300 shrink-0 mt-0.5">—</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </FingerprintSection>
          )}

          {/* Summary */}
          <FingerprintSection
            title="Agent Summary"
            fieldPath="summary"
            placeholder="Edit this summary to better represent you — this is what your agent will use when describing you."
            onCorrect={handleCorrect}
          >
            <p className="text-sm text-slate-700 leading-relaxed">
              {fingerprint.summary || 'No summary generated yet.'}
            </p>
          </FingerprintSection>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleContinue}
            disabled={submitting}
            className="bg-[#6366F1] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#5558e8] transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Looks good — continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Step 4: Additional Signals
// -------------------------------------------------------

function Step4Signals({
  userId,
  onNext,
}: {
  userId: string
  onNext: () => void
}) {
  const supabase = createClient()
  const [signals, setSignals] = useState({
    linkedin_url: '',
    stackoverflow_url: '',
    video_url: '',
    case_study_response: '',
  })
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const saveField = async (field: string, value: string) => {
    await supabase.from('candidate_signals').upsert({
      user_id: userId,
      [field]: value,
    }, { onConflict: 'user_id' })
    setSaved(s => ({ ...s, [field]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [field]: false })), 2000)
  }

  const filledCount = Object.values(signals).filter(v => v.trim()).length

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A]">Additional signals</h1>
          <p className="text-slate-500 mt-1">
            All optional — each one gives your agent more to work with. {filledCount}/4 complete.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LinkedIn */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#0A66C2]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-[#0F172A]">LinkedIn</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">We cross-reference your employment history with your GitHub timeline.</p>
            <input
              type="url"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              placeholder="https://linkedin.com/in/..."
              value={signals.linkedin_url}
              onChange={e => setSignals(s => ({ ...s, linkedin_url: e.target.value }))}
              onBlur={e => e.target.value && saveField('linkedin_url', e.target.value)}
            />
            {saved.linkedin_url && <p className="text-xs text-[#10B981] mt-1">Saved</p>}
          </div>

          {/* Stack Overflow */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#F48024]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#F48024]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.725 0l-1.72 1.277 6.39 8.588 1.716-1.277zm-3.94 3.418l-1.369 1.644 8.225 6.85 1.369-1.644zm-3.15 4.465l-.905 1.94 9.702 4.517.904-1.94zm-1.85 4.86l-.44 2.093 10.473 2.201.44-2.092zm-.88 5.35V20h10.71v-1.906zm0 2.968V24h10.71v-1.908z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-[#0F172A]">Stack Overflow</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">We pull your reputation and top tags to add to your profile.</p>
            <input
              type="url"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              placeholder="https://stackoverflow.com/users/..."
              value={signals.stackoverflow_url}
              onChange={e => setSignals(s => ({ ...s, stackoverflow_url: e.target.value }))}
              onBlur={e => e.target.value && saveField('stackoverflow_url', e.target.value)}
            />
            {saved.stackoverflow_url && <p className="text-xs text-[#10B981] mt-1">Saved</p>}
          </div>

          {/* Video Intro */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#6366F1]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#0F172A]">Video Intro</h3>
            </div>
            <p className="text-xs text-slate-500 mb-2">Paste a Loom URL. Dramatically increases recruiter interest.</p>
            <p className="text-xs text-slate-400 mb-3 italic">Tell us: what you are working on now, what you are looking for, and one instant dealbreaker for you.</p>
            <input
              type="url"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              placeholder="https://loom.com/share/..."
              value={signals.video_url}
              onChange={e => setSignals(s => ({ ...s, video_url: e.target.value }))}
              onBlur={e => e.target.value && saveField('video_url', e.target.value)}
            />
            {saved.video_url && <p className="text-xs text-[#10B981] mt-1">Saved</p>}
          </div>

          {/* Case Study */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#0F172A]">Case Study</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3 italic">Pick one problem that genuinely tested you. What was it, why was it hard, how did you solve it, what would you do differently? (300-500 words)</p>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
              rows={4}
              placeholder="Describe your most complex technical challenge..."
              value={signals.case_study_response}
              onChange={e => setSignals(s => ({ ...s, case_study_response: e.target.value }))}
              onBlur={e => e.target.value && saveField('case_study_response', e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">{signals.case_study_response.trim().split(/\s+/).filter(Boolean).length} words</p>
            {saved.case_study_response && <p className="text-xs text-[#10B981] mt-1">Saved</p>}
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={onNext}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={onNext}
            className="bg-[#6366F1] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#5558e8] transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Step 5: Role Preferences
// -------------------------------------------------------

function Step5Preferences({
  candidateProfile,
  userId,
  onNext,
}: {
  candidateProfile: any
  userId: string
  onNext: () => void
}) {
  const supabase = createClient()
  const [form, setForm] = useState({
    target_roles: (candidateProfile?.target_roles || []).join(', '),
    preferred_industries: (candidateProfile?.preferred_industries || []).join(', '),
    remote_preference: candidateProfile?.remote_preference || 'flexible',
    comp_min: candidateProfile?.comp_min || '',
    comp_max: candidateProfile?.comp_max || '',
    visa_sponsorship_required: candidateProfile?.visa_sponsorship_required || false,
    available_to_start: candidateProfile?.available_to_start || 'flexible',
    hard_dealbreakers: candidateProfile?.hard_dealbreakers || '',
    next_role_priorities: candidateProfile?.next_role_priorities || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const targetRoles = form.target_roles.split(',').map((r: string) => r.trim()).filter(Boolean)
    const preferredIndustries = form.preferred_industries.split(',').map((i: string) => i.trim()).filter(Boolean)

    await supabase.from('candidate_profiles').upsert({
      user_id: userId,
      target_roles: targetRoles,
      preferred_industries: preferredIndustries,
      remote_preference: form.remote_preference,
      comp_min: form.comp_min ? parseInt(form.comp_min as string) : null,
      comp_max: form.comp_max ? parseInt(form.comp_max as string) : null,
      visa_sponsorship_required: form.visa_sponsorship_required,
      available_to_start: form.available_to_start,
      hard_dealbreakers: form.hard_dealbreakers,
      next_role_priorities: form.next_role_priorities,
    }, { onConflict: 'user_id' })

    setSaving(false)
    onNext()
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A]">Role preferences</h1>
          <p className="text-slate-500 mt-1">Your agent uses this to filter out bad fits automatically.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target roles</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              placeholder="Senior Engineer, Staff Engineer, Tech Lead (comma-separated)"
              value={form.target_roles}
              onChange={e => setForm(f => ({ ...f, target_roles: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industries of interest</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              placeholder="Fintech, Healthcare, Developer Tools (comma-separated)"
              value={form.preferred_industries}
              onChange={e => setForm(f => ({ ...f, preferred_industries: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Remote preference</label>
            <div className="flex gap-3">
              {['hybrid', 'onsite', 'flexible'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="remote_preference"
                    value={opt}
                    checked={form.remote_preference === opt}
                    onChange={() => setForm(f => ({ ...f, remote_preference: opt }))}
                    className="text-[#6366F1] focus:ring-[#6366F1]"
                  />
                  <span className="text-sm text-slate-700 capitalize">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min comp ($)</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                placeholder="150000"
                value={form.comp_min}
                onChange={e => setForm(f => ({ ...f, comp_min: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max comp ($)</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                placeholder="250000"
                value={form.comp_max}
                onChange={e => setForm(f => ({ ...f, comp_max: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-700">Visa sponsorship required</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, visa_sponsorship_required: !f.visa_sponsorship_required }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.visa_sponsorship_required ? 'bg-[#6366F1]' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.visa_sponsorship_required ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Available to start</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              value={form.available_to_start}
              onChange={e => setForm(f => ({ ...f, available_to_start: e.target.value }))}
            >
              <option value="immediately">Immediately</option>
              <option value="2_weeks">2 weeks</option>
              <option value="1_month">1 month</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hard dealbreakers</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
              rows={2}
              placeholder="e.g. No crypto/web3, no on-call rotations"
              value={form.hard_dealbreakers}
              onChange={e => setForm(f => ({ ...f, hard_dealbreakers: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">What you are optimizing for in your next role</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
              rows={3}
              placeholder="e.g. Ownership and technical depth, not managing people yet, product that users actually care about"
              value={form.next_role_priorities}
              onChange={e => setForm(f => ({ ...f, next_role_priorities: e.target.value }))}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#6366F1] text-white py-3 rounded-xl font-semibold hover:bg-[#5558e8] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Step 6: Agent Ready
// -------------------------------------------------------

function Step6Ready({
  onboardingSession,
  githubProfile,
}: {
  onboardingSession: any
  githubProfile: any
}) {
  const fingerprint = githubProfile?.technical_fingerprint || {}
  const strength = onboardingSession?.profile_strength || 0
  const readiness = onboardingSession?.agent_readiness || 'not_ready'

  const readinessConfig: Record<string, { label: string; color: string; bg: string }> = {
    not_ready: { label: 'Not Ready', color: 'text-slate-500', bg: 'bg-slate-100' },
    basic: { label: 'Basic', color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10' },
    good: { label: 'Good', color: 'text-[#6366F1]', bg: 'bg-[#6366F1]/10' },
    strong: { label: 'Strong', color: 'text-[#10B981]', bg: 'bg-[#10B981]/10' },
    exceptional: { label: 'Exceptional', color: 'text-[#6366F1]', bg: 'bg-[#6366F1]/10' },
  }

  const rc = readinessConfig[readiness] || readinessConfig.not_ready

  const suggestions = []
  if (!onboardingSession?.github_ingested) suggestions.push('Connect and analyze your GitHub profile (+25 points)')
  if (!onboardingSession?.basics_complete) suggestions.push('Fill in your professional basics (+15 points)')
  if (!onboardingSession?.preferences_complete) suggestions.push('Set your role preferences (+15 points)')
  if (!onboardingSession?.fingerprint_reviewed) suggestions.push('Review your technical fingerprint (+10 points)')
  if (!onboardingSession?.video_uploaded) suggestions.push('Record a 60-second video intro (+10 points)')
  if (!onboardingSession?.case_study_complete) suggestions.push('Write a technical case study (+10 points)')

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold mb-4 ${rc.bg} ${rc.color}`}>
            {rc.label}
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Your agent is {readiness === 'not_ready' ? 'almost' : ''} ready</h1>
          <p className="text-slate-500">Your agent is active and matching you against open roles. We will notify you when we find strong matches.</p>
        </div>

        {/* Profile strength */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Profile strength</span>
            <span className="text-sm font-bold text-[#6366F1]">{strength}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${strength >= 80 ? 'bg-[#10B981]' : strength >= 60 ? 'bg-[#6366F1]' : 'bg-[#F59E0B]'}`}
              style={{ width: `${strength}%` }}
            />
          </div>
          {strength < 80 && suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Improve your profile:</p>
              <ul className="space-y-1">
                {suggestions.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-[#6366F1] shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recruiter preview */}
        {fingerprint.seniority_estimate && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">What a recruiter sees</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-32 shrink-0">Seniority</span>
                <span className="text-sm font-medium text-[#0F172A] capitalize">{fingerprint.seniority_estimate}</span>
              </div>
              {fingerprint.primary_languages?.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-500 w-32 shrink-0">Top languages</span>
                  <div className="flex flex-wrap gap-1">
                    {fingerprint.primary_languages.slice(0, 4).map((l: any) => (
                      <span key={l.language} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {l.language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {fingerprint.strongest_use_case && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-slate-500 w-32 shrink-0">Best fit for</span>
                  <span className="text-sm text-slate-600">{fingerprint.strongest_use_case}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/dashboard/opportunities"
            className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#5558e8] transition-colors"
          >
            View your opportunities →
          </Link>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Step indicator
// -------------------------------------------------------

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-4">
        <span className="text-xs text-slate-400 shrink-0">Step {step} of {total}</span>
        <div className="flex-1 bg-slate-100 rounded-full h-1">
          <div
            className="bg-[#6366F1] h-1 rounded-full transition-all duration-500"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Main OnboardingFlow
// -------------------------------------------------------

export default function OnboardingFlow({
  userId,
  githubProfile,
  onboardingSession,
  candidateProfile,
}: Props) {
  // Determine starting step
  const getInitialStep = () => {
    if (!githubProfile) return 1
    if (githubProfile.ingestion_status !== 'complete') return 2
    if (!onboardingSession?.fingerprint_reviewed) return 3
    if (!onboardingSession?.preferences_complete) return 4
    return 6
  }

  const [step, setStep] = useState(getInitialStep)
  const [localOnboardingSession] = useState(onboardingSession)
  const [localGithubProfile, setLocalGithubProfile] = useState(githubProfile)

  // After ingestion completes, refresh github profile data for step 3
  const handleIngestionComplete = useCallback(async () => {
    const res = await fetch('/api/github/status')
    if (res.ok) {
      const supabase = createClient()
      const { data: gp } = await supabase
        .from('github_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (gp) setLocalGithubProfile(gp)
    }
    setStep(3)
  }, [userId])

  const advanceTo = (s: number) => setStep(s)

  const TOTAL_STEPS = 6

  if (step === 1) {
    return (
      <>
        <StepIndicator step={1} total={TOTAL_STEPS} />
        <div className="pt-12">
          <Step1Connect />
        </div>
      </>
    )
  }

  if (step === 2) {
    return (
      <>
        <StepIndicator step={2} total={TOTAL_STEPS} />
        <div className="pt-12">
          <Step2Ingestion
            githubProfile={localGithubProfile}
            candidateProfile={candidateProfile}
            userId={userId}
            onComplete={handleIngestionComplete}
          />
        </div>
      </>
    )
  }

  if (step === 3) {
    return (
      <>
        <StepIndicator step={3} total={TOTAL_STEPS} />
        <div className="pt-12">
          <Step3Review
            githubProfile={localGithubProfile}
            onNext={() => advanceTo(4)}
          />
        </div>
      </>
    )
  }

  if (step === 4) {
    return (
      <>
        <StepIndicator step={4} total={TOTAL_STEPS} />
        <div className="pt-12">
          <Step4Signals userId={userId} onNext={() => advanceTo(5)} />
        </div>
      </>
    )
  }

  if (step === 5) {
    return (
      <>
        <StepIndicator step={5} total={TOTAL_STEPS} />
        <div className="pt-12">
          <Step5Preferences
            candidateProfile={candidateProfile}
            userId={userId}
            onNext={() => advanceTo(6)}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <StepIndicator step={6} total={TOTAL_STEPS} />
      <div className="pt-12">
        <Step6Ready
          onboardingSession={localOnboardingSession}
          githubProfile={localGithubProfile}
        />
      </div>
    </>
  )
}

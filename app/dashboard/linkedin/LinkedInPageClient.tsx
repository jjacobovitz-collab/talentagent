'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface LinkedInProfile {
  id: string
  parse_status: string
  raw_text: string | null
  headline: string | null
  summary: string | null
  location: string | null
  positions: any[]
  skills: any[]
  education: any[]
  certifications: any[]
  total_experience_years: number | null
  career_trajectory: string | null
  parsed_at: string | null
}

interface CrossReference {
  consistency_score: number | null
  consistency_rating: string | null
  timeline_analysis: any[]
  skill_analysis: any[]
  seniority_consistency: any
  corroboration_highlights: string[]
  consistency_flags: string[]
  red_flags: string[]
  cross_reference_summary: string | null
  questions_to_ask: string[]
  analyzed_at: string | null
}

interface Props {
  linkedinProfile: LinkedInProfile | null
  crossReference: CrossReference | null
}

const PROGRESS_MESSAGES = [
  'Reading your employment history...',
  'Extracting skills and experience...',
  'Cross-referencing with your GitHub...',
  'Building consistency analysis...',
]

function consistencyBadgeClass(consistency: string) {
  switch (consistency) {
    case 'corroborated': return 'bg-[#10B981]/10 text-[#10B981]'
    case 'neutral': return 'bg-slate-100 text-slate-500'
    case 'gap': return 'bg-[#F59E0B]/10 text-[#F59E0B]'
    case 'conflict': return 'bg-[#EF4444]/10 text-[#EF4444]'
    default: return 'bg-slate-100 text-slate-500'
  }
}

function consistencyLabel(consistency: string) {
  switch (consistency) {
    case 'corroborated': return 'Corroborated'
    case 'neutral': return 'Neutral'
    case 'gap': return 'Review'
    case 'conflict': return 'Conflict'
    default: return consistency
  }
}

function evidenceStrengthClass(strength: string) {
  switch (strength) {
    case 'strong': return 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
    case 'moderate': return 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
    case 'weak': return 'bg-slate-100 text-slate-500 border border-slate-200'
    case 'none': return 'bg-slate-100 text-slate-400 border border-slate-200'
    default: return 'bg-slate-100 text-slate-500 border border-slate-200'
  }
}

function evidenceStrengthLabel(strength: string) {
  switch (strength) {
    case 'strong': return 'GitHub Verified'
    case 'moderate': return 'Partial Evidence'
    case 'weak': return 'Unverified'
    case 'none': return 'Unverified'
    default: return strength
  }
}

function scoreColor(score: number) {
  if (score >= 85) return '#10B981'
  if (score >= 70) return '#6366F1'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Strong'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Mixed'
  return 'Weak'
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onSubmit }: { onSubmit: () => void }) {
  const [text, setText] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTextSubmit = async () => {
    if (!text || text.length < 100) {
      toast.error('Please paste more LinkedIn profile text (at least 100 characters)')
      return
    }
    setSubmitting(true)
    const fd = new FormData()
    fd.append('method', 'text_paste')
    fd.append('text', text)
    const res = await fetch('/api/linkedin/parse', { method: 'POST', body: fd })
    if (res.ok) {
      onSubmit()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to submit')
    }
    setSubmitting(false)
  }

  const handlePdfSubmit = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file')
      return
    }
    setSubmitting(true)
    const fd = new FormData()
    fd.append('method', 'pdf_upload')
    fd.append('pdf', pdfFile)
    const res = await fetch('/api/linkedin/parse', { method: 'POST', body: fd })
    if (res.ok) {
      onSubmit()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to submit')
    }
    setSubmitting(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
    } else {
      toast.error('Please drop a PDF file')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Text paste card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-[#0F172A] mb-1">Paste your LinkedIn profile</h2>
          <p className="text-xs text-slate-400 mb-4">
            Go to your LinkedIn profile → right click → Select All → Copy → Paste below
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            placeholder="Paste your LinkedIn profile text here..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
          />
          <button
            onClick={handleTextSubmit}
            disabled={submitting || text.length < 100}
            className="mt-3 w-full bg-[#6366F1] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Analyze Profile'}
          </button>
        </div>

        {/* PDF upload card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-[#0F172A] mb-1">Upload your LinkedIn PDF</h2>
          <p className="text-xs text-slate-400 mb-4">
            LinkedIn → Me → Settings &amp; Privacy → Data Privacy → Get a copy of your data → Download profile as PDF
          </p>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-[#6366F1] bg-[#6366F1]/5' : 'border-slate-200 hover:border-[#6366F1]/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
            />
            {pdfFile ? (
              <div>
                <p className="text-[#10B981] font-medium text-sm">{pdfFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(pdfFile.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-4xl mb-2">📄</p>
                <p className="text-sm text-slate-500">Drop PDF here or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">PDF files only</p>
              </div>
            )}
          </div>
          <button
            onClick={handlePdfSubmit}
            disabled={submitting || !pdfFile}
            className="mt-3 w-full bg-[#6366F1] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Uploading...' : 'Upload and Analyze'}
          </button>
        </div>
      </div>

      {/* Privacy callout */}
      <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#6366F1] mb-2">Privacy</h3>
        <ul className="space-y-1.5">
          {[
            'Your LinkedIn data is only used to build your agent profile and cross-reference with your GitHub',
            'We never contact anyone from your LinkedIn network',
            'Delete your LinkedIn data at any time from settings',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="text-[#10B981] shrink-0 mt-0.5">✓</span> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Parsing state ────────────────────────────────────────────────────────────

function ParsingState({ onComplete }: { onComplete: () => void }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % PROGRESS_MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await fetch('/api/linkedin/status')
      if (res.ok) {
        const data = await res.json()
        if (data.linkedin?.parse_status === 'complete') {
          onComplete()
        }
      }
    }, 3000)
    return () => clearInterval(poll)
  }, [onComplete])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
      <div className="inline-block w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mb-6" />
      <h2 className="font-semibold text-[#0F172A] text-lg mb-2">Analyzing your LinkedIn profile</h2>
      <p className="text-[#6366F1] text-sm font-medium animate-pulse">{PROGRESS_MESSAGES[msgIdx]}</p>
      <p className="text-slate-400 text-xs mt-4">This usually takes 30-60 seconds</p>
    </div>
  )
}

// ─── Complete state ───────────────────────────────────────────────────────────

function EmploymentTimeline({ positions, timelineAnalysis }: { positions: any[]; timelineAnalysis: any[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  if (!positions?.length) return null

  const findAnalysis = (pos: any) => {
    return timelineAnalysis?.find(t => {
      const period = t.period?.toLowerCase() ?? ''
      return period.includes(pos.company?.toLowerCase() ?? '') ||
        period.includes(String(pos.start_year)) ||
        t.linkedin_claim?.toLowerCase().includes(pos.company?.toLowerCase() ?? '')
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-semibold text-[#0F172A] mb-5">Employment Timeline</h3>
      <div className="space-y-0">
        {positions.map((pos: any, i: number) => {
          const analysis = findAnalysis(pos)
          const isExpanded = expandedIdx === i
          const startStr = [pos.start_month ? new Date(2000, pos.start_month - 1).toLocaleString('default', { month: 'short' }) : null, pos.start_year].filter(Boolean).join(' ')
          const endStr = pos.is_current ? 'Present' : [pos.end_month ? new Date(2000, pos.end_month - 1).toLocaleString('default', { month: 'short' }) : null, pos.end_year].filter(Boolean).join(' ')

          return (
            <div key={i} className="flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[#6366F1] shrink-0 mt-1" />
                {i < positions.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1" />}
              </div>

              <div className="pb-6 flex-1 min-w-0">
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[#0F172A] text-sm">{pos.company}</p>
                      <p className="text-slate-500 text-xs">{pos.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {startStr} – {endStr}
                        {pos.duration_months ? ` · ${pos.duration_months} mos` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {analysis && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${consistencyBadgeClass(analysis.consistency)}`}>
                          {consistencyLabel(analysis.consistency)}
                        </span>
                      )}
                      <span className="text-slate-300 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </button>

                {isExpanded && analysis && (
                  <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-1">GitHub evidence</p>
                    <p className="text-xs text-slate-700">{analysis.github_evidence}</p>
                    {analysis.notes && (
                      <p className="text-xs text-slate-500 italic mt-1">{analysis.notes}</p>
                    )}
                  </div>
                )}
                {isExpanded && !analysis && pos.description && (
                  <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-600">{pos.description}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillsVerification({ skillAnalysis }: { skillAnalysis: any[] }) {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)

  if (!skillAnalysis?.length) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-semibold text-[#0F172A] mb-4">Skills Verification</h3>
      <div className="flex flex-wrap gap-2">
        {skillAnalysis.map((s: any) => {
          const isExpanded = expandedSkill === s.skill
          return (
            <div key={s.skill}>
              <button
                onClick={() => setExpandedSkill(isExpanded ? null : s.skill)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${evidenceStrengthClass(s.evidence_strength)} hover:opacity-80`}
              >
                <span>{s.skill}</span>
                <span className="opacity-70 text-[10px]">{evidenceStrengthLabel(s.evidence_strength)}</span>
              </button>
              {isExpanded && s.repos_cited?.length > 0 && (
                <div className="mt-1 ml-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-600">
                  <span className="font-medium">Repos: </span>{s.repos_cited.join(', ')}
                  {s.github_evidence && <p className="text-slate-500 mt-0.5 italic">{s.github_evidence}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981]" /> GitHub Verified</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Partial Evidence</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> Unverified</span>
      </div>
    </div>
  )
}

function ConsistencyScore({ score, summary }: { score: number; summary: string | null }) {
  const color = scoreColor(score)
  const label = scoreLabel(score)
  const circumference = 2 * Math.PI * 40
  const strokeDash = (score / 100) * circumference

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-semibold text-[#0F172A] mb-4">Consistency Score</h3>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{score}</span>
            <span className="text-xs font-medium" style={{ color }}>{label}</span>
          </div>
        </div>
        {summary && (
          <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>
        )}
      </div>
    </div>
  )
}

function FlagsAndHighlights({
  highlights,
  flags,
  redFlags,
  questions,
}: {
  highlights: string[]
  flags: string[]
  redFlags: string[]
  questions: string[]
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
      <h3 className="font-semibold text-[#0F172A]">Flags &amp; Highlights</h3>

      {highlights?.length > 0 && (
        <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-lg p-4">
          <p className="text-xs font-semibold text-[#10B981] uppercase tracking-wide mb-2">Corroboration Highlights</p>
          <ul className="space-y-1.5">
            {highlights.map((h, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-[#10B981] shrink-0">✓</span> {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {flags?.length > 0 && (
        <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-lg p-4">
          <p className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wide mb-2">Worth Discussing</p>
          <ul className="space-y-1.5">
            {flags.map((f, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-[#F59E0B] shrink-0">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {redFlags?.length > 0 && (
        <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg p-4">
          <p className="text-xs font-semibold text-[#EF4444] uppercase tracking-wide mb-2">Concerns</p>
          <ul className="space-y-1.5">
            {redFlags.map((f, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-[#EF4444] shrink-0">!</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {questions?.length > 0 && (
        <div className="pt-2 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Questions to ask employers</p>
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-[#6366F1] shrink-0 font-medium">{i + 1}.</span> {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CompleteState({
  linkedinProfile,
  crossReference,
  onReanalyze,
}: {
  linkedinProfile: LinkedInProfile
  crossReference: CrossReference | null
  onReanalyze: () => void
}) {
  const [reanalyzing, setReanalyzing] = useState(false)

  const handleReanalyze = async () => {
    if (!linkedinProfile.raw_text) return
    setReanalyzing(true)
    const fd = new FormData()
    fd.append('method', linkedinProfile.raw_text ? 'text_paste' : 'text_paste')
    fd.append('text', linkedinProfile.raw_text ?? '')
    const res = await fetch('/api/linkedin/parse', { method: 'POST', body: fd })
    if (res.ok) {
      onReanalyze()
    } else {
      toast.error('Re-analysis failed')
    }
    setReanalyzing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            {linkedinProfile.headline && (
              <h2 className="font-semibold text-[#0F172A]">{linkedinProfile.headline}</h2>
            )}
            <div className="flex items-center gap-3 mt-1">
              {linkedinProfile.location && (
                <span className="text-xs text-slate-400">{linkedinProfile.location}</span>
              )}
              {linkedinProfile.total_experience_years != null && (
                <span className="text-xs text-slate-400">{linkedinProfile.total_experience_years} yrs experience</span>
              )}
              {linkedinProfile.career_trajectory && (
                <span className="text-xs px-2 py-0.5 bg-[#6366F1]/10 text-[#6366F1] rounded-full capitalize">
                  {linkedinProfile.career_trajectory} trajectory
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Analysis complete
            </span>
            {linkedinProfile.raw_text && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="px-3 py-1.5 text-xs border border-slate-200 text-slate-500 rounded-lg hover:border-[#6366F1] hover:text-[#6366F1] transition-colors disabled:opacity-50"
              >
                {reanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Employment Timeline */}
      <EmploymentTimeline
        positions={linkedinProfile.positions ?? []}
        timelineAnalysis={crossReference?.timeline_analysis ?? []}
      />

      {/* Skills Verification */}
      {crossReference?.skill_analysis?.length ? (
        <SkillsVerification skillAnalysis={crossReference.skill_analysis} />
      ) : null}

      {/* Consistency Score */}
      {crossReference?.consistency_score != null && (
        <ConsistencyScore
          score={crossReference.consistency_score}
          summary={crossReference.cross_reference_summary}
        />
      )}

      {/* Flags & Highlights */}
      {crossReference && (
        <FlagsAndHighlights
          highlights={crossReference.corroboration_highlights ?? []}
          flags={crossReference.consistency_flags ?? []}
          redFlags={crossReference.red_flags ?? []}
          questions={crossReference.questions_to_ask ?? []}
        />
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LinkedInPageClient({ linkedinProfile, crossReference }: Props) {
  const [state, setState] = useState<'empty' | 'parsing' | 'complete'>(() => {
    if (!linkedinProfile) return 'empty'
    if (linkedinProfile.parse_status === 'complete') return 'complete'
    if (linkedinProfile.parse_status === 'parsing' || linkedinProfile.parse_status === 'pending') return 'parsing'
    return 'empty'
  })

  const [currentProfile, setCurrentProfile] = useState(linkedinProfile)
  const [currentCrossRef, setCurrentCrossRef] = useState(crossReference)

  const handleParsingComplete = async () => {
    const res = await fetch('/api/linkedin/status')
    if (res.ok) {
      const data = await res.json()
      if (data.linkedin) setCurrentProfile((prev: any) => ({ ...prev, ...data.linkedin }))
      if (data.crossRef) setCurrentCrossRef(data.crossRef)
    }
    setState('complete')
  }

  if (state === 'empty') {
    return <EmptyState onSubmit={() => setState('parsing')} />
  }

  if (state === 'parsing') {
    return <ParsingState onComplete={handleParsingComplete} />
  }

  if (!currentProfile) return null

  return (
    <CompleteState
      linkedinProfile={currentProfile}
      crossReference={currentCrossRef}
      onReanalyze={() => setState('parsing')}
    />
  )
}

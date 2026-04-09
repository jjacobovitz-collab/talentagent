'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface ParsedJD {
  role_title: string | null
  seniority_level: string | null
  role_category: string | null
  required_skills: string[]
  preferred_skills: string[]
  tech_stack: string[]
  years_experience_min: number | null
  years_experience_max: number | null
  comp_min: number | null
  comp_max: number | null
  remote_type: string | null
  visa_sponsorship: boolean | null
  key_responsibilities: string[]
  team_context: string | null
  company_name: string | null
  location: string | null
  what_jd_emphasizes: string | null
  what_jd_omits: string[]
  red_flags_in_jd: string[]
}

interface Question {
  question: string
  field: string
  why_we_are_asking: string
  placeholder: string
}

interface SuggestedTemplate {
  template_name: string
  common_required_skills: string[]
  standard_why_candidates_fail: string | null
  standard_hiring_manager_priorities: string | null
}

const PARSE_MESSAGES = [
  'Reading job requirements...',
  'Extracting tech stack...',
  'Identifying gaps in the JD...',
  'Generating follow-up questions...',
]

function TagList({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const addTag = (val: string) => {
    const trimmed = val.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput('')
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-lg min-h-[42px]">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 bg-[#6366F1]/10 text-[#6366F1] text-xs px-2 py-1 rounded">
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-[#EF4444]">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input) } }}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder="Add..."
        className="text-xs outline-none bg-transparent min-w-[60px] flex-1"
      />
    </div>
  )
}

function NewAgentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [jdText, setJdText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseMessages, setParseMessages] = useState(0)
  const [parseId, setParseId] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedJD | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
  const [suggestedTemplate, setSuggestedTemplate] = useState<SuggestedTemplate | null>(null)
  const [createdAgent, setCreatedAgent] = useState<Record<string, unknown> | null>(null)
  const [creating, setCreating] = useState(false)
  const autoTriggered = useRef(false)

  const handleParse = useCallback(async () => {
    if (parsing || jdText.length < 100) return
    setParsing(true)
    setParseMessages(0)

    const interval = setInterval(() => {
      setParseMessages(prev => Math.min(prev + 1, PARSE_MESSAGES.length - 1))
    }, 800)

    try {
      const res = await fetch('/api/jd/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText, sourceUrl: sourceUrl || undefined })
      })
      const data = await res.json()
      if (data.parseId) {
        setParseId(data.parseId)
        setParsed(data.parsed)
        setQuestions(data.questions || [])
        setSuggestedTemplate(data.suggestedTemplate || null)
        setStep(2)
      }
    } catch {
      // parsing failed silently
    } finally {
      clearInterval(interval)
      setParsing(false)
    }
  }, [parsing, jdText, sourceUrl])

  useEffect(() => {
    const prefilledJD = searchParams.get('jd')
    const prefilledSource = searchParams.get('source')
    if (prefilledJD && !autoTriggered.current) {
      autoTriggered.current = true
      const decoded = decodeURIComponent(prefilledJD)
      setJdText(decoded)
      if (prefilledSource) setSourceUrl(decodeURIComponent(prefilledSource))
      if (decoded.length > 100) {
        setTimeout(() => handleParse(), 500)
      }
    }
  }, [searchParams, handleParse])

  const handleCreateAgent = async () => {
    if (!parsed || creating) return
    setCreating(true)
    try {
      const answers = questions.map(q => ({
        field: q.field,
        answer: questionAnswers[q.field] || ''
      }))
      const res = await fetch('/api/jd/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parseId,
          parsed,
          questionAnswers: answers,
          rawJdText: jdText
        })
      })
      const data = await res.json()
      if (data.buyerAgent) {
        setCreatedAgent(data.buyerAgent)
        setStep(3)
      }
    } finally {
      setCreating(false)
    }
  }

  // Step 1
  if (step === 1) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0F172A]">Create Buyer Agent</h1>
          <p className="text-slate-500 mt-1">Paste a job description and we extract everything automatically.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">Job Description</label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              rows={12}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
              placeholder="Paste the job description here. Copy it from Greenhouse, Lever, your ATS, a Word doc, anywhere. We will extract everything automatically."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-2">Source URL (optional)</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              placeholder="https://jobs.lever.co/company/role"
            />
          </div>

          {parsing ? (
            <div className="flex items-center gap-3 py-2">
              <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-[#6366F1] font-medium">{PARSE_MESSAGES[parseMessages]}</p>
            </div>
          ) : (
            <button
              onClick={handleParse}
              disabled={jdText.length < 100}
              className="w-full bg-[#6366F1] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#5558e8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Parse this JD →
            </button>
          )}
        </div>
      </div>
    )
  }

  // Step 2
  if (step === 2 && parsed) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
            <h1 className="text-2xl font-bold text-[#0F172A]">Review & Complete</h1>
          </div>
          <p className="text-slate-500 text-sm">Confirm what we extracted and answer 3 quick questions.</p>
        </div>

        {suggestedTemplate && (
          <div className="mb-6 bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-4 text-sm">
            <span className="font-semibold text-[#6366F1]">Template found:</span>{' '}
            <span className="text-slate-700">You have created similar agents before ({suggestedTemplate.template_name}). Some fields were pre-filled from your patterns.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: parsed fields */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Extracted from JD</h2>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Role Title</label>
                <input
                  value={parsed.role_title || ''}
                  onChange={e => setParsed({ ...parsed, role_title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Seniority</label>
                  <select
                    value={parsed.seniority_level || ''}
                    onChange={e => setParsed({ ...parsed, seniority_level: e.target.value || null })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                  >
                    <option value="">Unknown</option>
                    {['junior', 'mid', 'senior', 'staff', 'principal', 'director'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Remote</label>
                  <select
                    value={parsed.remote_type || ''}
                    onChange={e => setParsed({ ...parsed, remote_type: e.target.value || null })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                  >
                    <option value="">Unknown</option>
                    {['remote', 'hybrid', 'onsite', 'flexible'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Min Experience (yrs)</label>
                  <input
                    type="number"
                    value={parsed.years_experience_min ?? ''}
                    onChange={e => setParsed({ ...parsed, years_experience_min: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Max Experience (yrs)</label>
                  <input
                    type="number"
                    value={parsed.years_experience_max ?? ''}
                    onChange={e => setParsed({ ...parsed, years_experience_max: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Comp Min ($)</label>
                  <input
                    type="number"
                    value={parsed.comp_min ?? ''}
                    onChange={e => setParsed({ ...parsed, comp_min: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Comp Max ($)</label>
                  <input
                    type="number"
                    value={parsed.comp_max ?? ''}
                    onChange={e => setParsed({ ...parsed, comp_max: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Required Skills</label>
                <TagList tags={parsed.required_skills || []} onChange={t => setParsed({ ...parsed, required_skills: t })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Preferred Skills</label>
                <TagList tags={parsed.preferred_skills || []} onChange={t => setParsed({ ...parsed, preferred_skills: t })} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tech Stack</label>
                <TagList tags={parsed.tech_stack || []} onChange={t => setParsed({ ...parsed, tech_stack: t })} />
              </div>
            </div>

            {parsed.red_flags_in_jd?.length > 0 && (
              <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#EF4444] mb-2">JD concerns</p>
                <ul className="space-y-1">
                  {parsed.red_flags_in_jd.map((f, i) => (
                    <li key={i} className="text-xs text-slate-600">· {f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: follow-up questions */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">3 Questions to Supercharge Your Agent</h2>

            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-sm font-semibold text-[#0F172A] mb-1">{q.question}</p>
                  <p className="text-xs text-slate-400 italic mb-3">{q.why_we_are_asking}</p>
                  <textarea
                    value={questionAnswers[q.field] || ''}
                    onChange={e => setQuestionAnswers(prev => ({ ...prev, [q.field]: e.target.value }))}
                    rows={3}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 resize-none"
                    placeholder={q.placeholder}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleCreateAgent}
              disabled={creating}
              className="w-full bg-[#6366F1] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#5558e8] transition-colors disabled:opacity-60"
            >
              {creating ? 'Creating agent...' : 'Create buyer agent →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step 3
  if (step === 3 && createdAgent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Agent Created</h1>
          <p className="text-slate-500 mt-2">Your buyer agent is now matching against the candidate pool.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-[#0F172A] mb-1">{createdAgent.role_title as string}</h2>
          <p className="text-slate-500 text-sm mb-4">{createdAgent.company_name as string}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {createdAgent.years_experience_min != null && (
              <div>
                <p className="text-xs text-slate-400">Experience</p>
                <p className="font-medium">{createdAgent.years_experience_min as number}–{createdAgent.years_experience_max as number} years</p>
              </div>
            )}
            {createdAgent.comp_band_min != null && (
              <div>
                <p className="text-xs text-slate-400">Comp range</p>
                <p className="font-medium">${(createdAgent.comp_band_min as number).toLocaleString()}–${(createdAgent.comp_band_max as number).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-4 mb-6 text-sm text-slate-700">
          <p className="font-medium text-[#6366F1] mb-1">Matching in progress</p>
          <p>Your agent is being assessed against all candidates with complete profiles. First results typically appear within 5 minutes.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setStep(1); setJdText(''); setSourceUrl(''); setParsed(null); setQuestions([]); setQuestionAnswers({}); setCreatedAgent(null) }}
            className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:border-slate-300 transition-colors"
          >
            Add another role
          </button>
          <button
            onClick={() => router.push('/dashboard/matches')}
            className="flex-1 bg-[#6366F1] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
          >
            View match queue →
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function NewAgentPage() {
  return (
    <Suspense>
      <NewAgentInner />
    </Suspense>
  )
}

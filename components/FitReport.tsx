'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Assessment {
  overall_fit_score: number
  technical_fit_score: number
  role_fit_score: number
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no'
  recommendation_summary: string
  requirements: Array<{
    requirement: string
    verdict: 'pass' | 'partial' | 'fail'
    evidence: string
    confidence: 'high' | 'medium' | 'low'
    notes: string
  }>
  green_flags: Array<{ flag: string; evidence: string }>
  yellow_flags: Array<{ flag: string; suggested_question: string }>
  red_flags: Array<{ flag: string; severity: 'minor' | 'significant' | 'dealbreaker'; reasoning: string }>
  compensation_alignment: { aligned: boolean; notes: string }
  visa_flag: boolean
  questions_for_human_screen: string[]
}

interface PrepItem {
  question: string
  skill_probed: string
  why_theyll_ask: string
  how_to_prepare: string
}

interface QuestionToAsk {
  question: string
  why_ask: string
  relates_to: string
}

interface FitReportProps {
  assessment: Assessment
  assessmentId?: string
  existingRating?: number | null
  role?: 'candidate' | 'recruiter'
  matchId?: string
}

function ScoreColor(score: number) {
  if (score >= 80) return 'text-[#10B981]'
  if (score >= 60) return 'text-[#F59E0B]'
  return 'text-[#EF4444]'
}

function ScoreBg(score: number) {
  if (score >= 80) return 'bg-[#10B981]'
  if (score >= 60) return 'bg-[#F59E0B]'
  return 'bg-[#EF4444]'
}

const recommendationConfig = {
  strong_yes: { label: 'Strong Yes', bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', border: 'border-[#10B981]/30' },
  yes: { label: 'Yes', bg: 'bg-[#6366F1]/10', text: 'text-[#6366F1]', border: 'border-[#6366F1]/30' },
  maybe: { label: 'Maybe', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/30' },
  no: { label: 'No', bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', border: 'border-[#EF4444]/30' },
}

const verdictConfig = {
  pass: { label: 'Pass', bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
  partial: { label: 'Partial', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]' },
  fail: { label: 'Fail', bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]' },
}

const severityConfig = {
  minor: 'text-[#F59E0B]',
  significant: 'text-orange-500',
  dealbreaker: 'text-[#EF4444]',
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2.5">
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-700`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export default function FitReport({ assessment, assessmentId, existingRating, role, matchId }: FitReportProps) {
  const [rating, setRating] = useState<number | null>(existingRating ?? null)
  const [feedback, setFeedback] = useState('')
  const [savingFeedback, setSavingFeedback] = useState(false)
  const [prepData, setPrepData] = useState<{ prepare_to_answer: PrepItem[]; questions_to_ask: QuestionToAsk[] } | null>(null)
  const [prepLoading, setPrepLoading] = useState(false)

  useEffect(() => {
    if (role !== 'candidate' || !matchId) return
    setPrepLoading(true)
    fetch('/api/matches/candidate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.prepare_to_answer || data.questions_to_ask) setPrepData(data)
      })
      .catch(() => {})
      .finally(() => setPrepLoading(false))
  }, [role, matchId])

  // Support both canonical field names and legacy/seed field names
  const a = assessment as any
  const overallScore: number = assessment.overall_fit_score ?? a.overall ?? 0
  const technicalScore: number = assessment.technical_fit_score ?? a.technical ?? 0
  const roleScore: number = assessment.role_fit_score ?? a.role ?? 0
  const screenQuestions: string[] = assessment.questions_for_human_screen ?? a.screen_questions ?? []

  const rec = recommendationConfig[assessment.recommendation] ?? recommendationConfig.maybe

  const saveFeedback = async () => {
    if (!assessmentId || rating === null) return
    setSavingFeedback(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('fit_assessments')
      .update({ recruiter_rating: rating, recruiter_feedback: feedback })
      .eq('id', assessmentId)

    if (error) {
      toast.error('Failed to save feedback')
    } else {
      toast.success('Feedback saved!')
    }
    setSavingFeedback(false)
  }

  return (
    <div className="space-y-6">
      {/* Overall score + recommendation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Overall Fit Score</p>
            <div className={`text-6xl font-bold ${ScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <p className="text-slate-400 text-sm mt-1">out of 100</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-2">Recommendation</p>
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${rec.bg} ${rec.text} ${rec.border}`}>
              {rec.label}
            </span>
          </div>
        </div>
        <p className="text-slate-700 mt-4 text-sm leading-relaxed border-t border-slate-100 pt-4">
          {assessment.recommendation_summary}
        </p>
      </div>

      {/* Technical and role fit scores */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-[#0F172A] mb-5">Score Breakdown</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-slate-700">Technical Fit</span>
              <span className={`text-sm font-semibold ${ScoreColor(technicalScore)}`}>
                {technicalScore}
              </span>
            </div>
            <ProgressBar value={technicalScore} color={ScoreBg(technicalScore)} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-slate-700">Role Fit</span>
              <span className={`text-sm font-semibold ${ScoreColor(roleScore)}`}>
                {roleScore}
              </span>
            </div>
            <ProgressBar value={roleScore} color={ScoreBg(roleScore)} />
          </div>
        </div>

        {/* Compensation + Visa */}
        {(assessment.compensation_alignment || assessment.visa_flag) && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex gap-6 flex-wrap">
            {assessment.compensation_alignment && (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${assessment.compensation_alignment.aligned ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {assessment.compensation_alignment.aligned ? '✓' : '✗'} Comp Alignment
                </span>
                {assessment.compensation_alignment.notes && (
                  <span className="text-slate-400 text-sm">— {assessment.compensation_alignment.notes}</span>
                )}
              </div>
            )}
            {assessment.visa_flag && (
              <span className="text-sm text-[#F59E0B] font-medium">⚠ Visa may be required</span>
            )}
          </div>
        )}
      </div>

      {/* Requirements */}
      {assessment.requirements?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-[#0F172A] mb-5">Requirement Analysis</h2>
          <div className="space-y-4">
            {assessment.requirements.map((req, i) => {
              const verdict = req.verdict ?? (req as any).status
              const v = verdictConfig[verdict] ?? verdictConfig.partial
              return (
                <div key={i} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-sm font-medium text-slate-700">{req.requirement}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {req.confidence && (
                        <span className="text-xs text-slate-400 capitalize">{req.confidence} confidence</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.bg} ${v.text}`}>
                        {v.label}
                      </span>
                    </div>
                  </div>
                  {req.evidence && (
                    <p className="text-xs text-slate-500 bg-slate-50 rounded px-3 py-2 mb-2 italic">
                      &ldquo;{req.evidence}&rdquo;
                    </p>
                  )}
                  {req.notes && (
                    <p className="text-xs text-slate-500">{req.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Flags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assessment.green_flags?.length > 0 && (
          <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-5">
            <h3 className="font-semibold text-[#10B981] mb-3 text-sm">Green Flags</h3>
            <ul className="space-y-3">
              {assessment.green_flags.map((f, i) => (
                <li key={i}>
                  <p className="text-sm font-medium text-slate-700">{f.flag}</p>
                  {f.evidence && <p className="text-xs text-slate-500 mt-0.5 italic">{f.evidence}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessment.yellow_flags?.length > 0 && (
          <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl p-5">
            <h3 className="font-semibold text-[#F59E0B] mb-3 text-sm">Yellow Flags</h3>
            <ul className="space-y-3">
              {assessment.yellow_flags.map((f, i) => (
                <li key={i}>
                  <p className="text-sm font-medium text-slate-700">{f.flag}</p>
                  {f.suggested_question && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ask: <em>{f.suggested_question}</em>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessment.red_flags?.length > 0 && (
          <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-5">
            <h3 className="font-semibold text-[#EF4444] mb-3 text-sm">Red Flags</h3>
            <ul className="space-y-3">
              {assessment.red_flags.map((f, i) => (
                <li key={i}>
                  <p className="text-sm font-medium text-slate-700">{f.flag}</p>
                  <p className={`text-xs font-medium capitalize mt-0.5 ${severityConfig[f.severity]}`}>
                    {f.severity}
                  </p>
                  {f.reasoning && <p className="text-xs text-slate-500 mt-0.5">{f.reasoning}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Candidate prep sections */}
      {role === 'candidate' && (
        prepLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center text-sm text-slate-400">
            Generating your interview prep...
          </div>
        ) : prepData ? (
          <>
            {prepData.prepare_to_answer?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="font-semibold text-[#0F172A] mb-1">Prepare to answer these</h2>
                <p className="text-xs text-slate-400 mb-5">Questions the recruiter plans to ask, and how to prep for each.</p>
                <div className="space-y-5">
                  {prepData.prepare_to_answer.map((item, i) => (
                    <div key={i} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-[#6366F1] font-bold shrink-0 text-sm">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.question}</p>
                          <span className="inline-block mt-1 text-xs bg-[#6366F1]/10 text-[#6366F1] px-2 py-0.5 rounded-full font-medium">
                            {item.skill_probed}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 italic mb-2 ml-6">{item.why_theyll_ask}</p>
                      <p className="text-xs text-slate-700 bg-slate-50 rounded px-3 py-2 ml-6 leading-relaxed">{item.how_to_prepare}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prepData.questions_to_ask?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="font-semibold text-[#0F172A] mb-1">Questions to ask them</h2>
                <p className="text-xs text-slate-400 mb-5">Tailored to this specific role based on what the fit report flagged.</p>
                <div className="space-y-4">
                  {prepData.questions_to_ask.map((item, i) => (
                    <div key={i} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-[#10B981] font-bold shrink-0 text-sm">{i + 1}.</span>
                        <p className="text-sm font-medium text-slate-800">{item.question}</p>
                      </div>
                      <div className="ml-5 flex items-start gap-2">
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">{item.relates_to}</span>
                        <p className="text-xs text-slate-500 leading-relaxed">{item.why_ask}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null
      )}

      {/* Questions for screen — recruiter view only */}
      {role !== 'candidate' && screenQuestions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4">Questions for Human Screen</h2>
          <ol className="space-y-2">
            {screenQuestions.map((q, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="text-[#6366F1] font-semibold shrink-0">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Recruiter feedback */}
      {role !== 'candidate' && assessmentId && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4">Your Feedback</h2>
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-2">Rate this assessment</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition-colors ${
                    rating !== null && star <= rating ? 'text-[#F59E0B]' : 'text-slate-200 hover:text-[#F59E0B]'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
            placeholder="Optional notes about this candidate..."
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm resize-none mb-3"
          />
          <button
            onClick={saveFeedback}
            disabled={rating === null || savingFeedback}
            className="px-5 py-2 bg-[#6366F1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {savingFeedback ? 'Saving...' : 'Save Feedback'}
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
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

interface FitReportProps {
  assessment: Assessment
  assessmentId?: string
  existingRating?: number | null
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

export default function FitReport({ assessment, assessmentId, existingRating }: FitReportProps) {
  const [rating, setRating] = useState<number | null>(existingRating ?? null)
  const [feedback, setFeedback] = useState('')
  const [savingFeedback, setSavingFeedback] = useState(false)

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
            <div className={`text-6xl font-bold ${ScoreColor(assessment.overall_fit_score)}`}>
              {assessment.overall_fit_score}
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
              <span className={`text-sm font-semibold ${ScoreColor(assessment.technical_fit_score)}`}>
                {assessment.technical_fit_score}
              </span>
            </div>
            <ProgressBar value={assessment.technical_fit_score} color={ScoreBg(assessment.technical_fit_score)} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-slate-700">Role Fit</span>
              <span className={`text-sm font-semibold ${ScoreColor(assessment.role_fit_score)}`}>
                {assessment.role_fit_score}
              </span>
            </div>
            <ProgressBar value={assessment.role_fit_score} color={ScoreBg(assessment.role_fit_score)} />
          </div>
        </div>

        {/* Compensation + Visa */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${assessment.compensation_alignment.aligned ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {assessment.compensation_alignment.aligned ? '✓' : '✗'} Comp Alignment
            </span>
            <span className="text-slate-400 text-sm">— {assessment.compensation_alignment.notes}</span>
          </div>
          {assessment.visa_flag && (
            <span className="text-sm text-[#F59E0B] font-medium">⚠ Visa may be required</span>
          )}
        </div>
      </div>

      {/* Requirements */}
      {assessment.requirements?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-[#0F172A] mb-5">Requirement Analysis</h2>
          <div className="space-y-4">
            {assessment.requirements.map((req, i) => {
              const v = verdictConfig[req.verdict] ?? verdictConfig.partial
              return (
                <div key={i} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-sm font-medium text-slate-700">{req.requirement}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 capitalize">{req.confidence} confidence</span>
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

      {/* Questions for screen */}
      {assessment.questions_for_human_screen?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-[#0F172A] mb-4">Questions for Human Screen</h2>
          <ol className="space-y-2">
            {assessment.questions_for_human_screen.map((q, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="text-[#6366F1] font-semibold shrink-0">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Recruiter feedback */}
      {assessmentId && (
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

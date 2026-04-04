'use client'

import { useState } from 'react'
import FitReport from '@/components/FitReport'
import toast from 'react-hot-toast'

interface Candidate {
  id: string
  title: string | null
  years_experience: number | null
  user_id: string
  completion_score: number | null
}

interface Assessment {
  id: string
  candidate_profile_id: string
  assessment_data: any
  overall_fit_score: number
  recommendation: string
  recruiter_rating: number | null
  created_at: string
}

const LOADING_MESSAGES = [
  'Reading candidate profile...',
  'Analyzing technical fit...',
  'Evaluating role alignment...',
  'Checking hidden dealbreakers...',
  'Generating assessment...',
]

export default function AgentDetailClient({
  agent,
  candidates,
  existingAssessments,
}: {
  agent: any
  candidates: Candidate[]
  existingAssessments: Assessment[]
}) {
  const [selectedCandidate, setSelectedCandidate] = useState<string>('')
  const [isAssessing, setIsAssessing] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [currentAssessment, setCurrentAssessment] = useState<{ assessment: any; id: string } | null>(null)
  const [tab, setTab] = useState<'assess' | 'history'>('assess')

  const runAssessment = async () => {
    if (!selectedCandidate) {
      toast.error('Select a candidate first')
      return
    }

    setIsAssessing(true)
    setCurrentAssessment(null)
    setLoadingMsg(0)

    // Rotate loading messages
    const interval = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)

    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAgentId: agent.id,
          candidateProfileId: selectedCandidate,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error ?? 'Assessment failed')
        return
      }

      setCurrentAssessment({ assessment: data.assessment, id: data.id })
      toast.success('Assessment complete!')
      setTab('assess')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      clearInterval(interval)
      setIsAssessing(false)
    }
  }

  const getExistingForCandidate = (candidateId: string) =>
    existingAssessments.find(a => a.candidate_profile_id === candidateId)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(['assess', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[#6366F1] text-[#6366F1]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'assess' ? 'Run Assessment' : `History (${existingAssessments.length})`}
          </button>
        ))}
      </div>

      {tab === 'assess' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-[#0F172A] mb-4">Assess a Candidate</h2>

            {candidates.length === 0 ? (
              <p className="text-slate-500 text-sm">No candidate profiles available yet.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Select candidate profile
                  </label>
                  <select
                    value={selectedCandidate}
                    onChange={e => setSelectedCandidate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm"
                  >
                    <option value="">Choose a candidate...</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title || 'Untitled'} — {c.years_experience ?? '?'} yrs exp
                        {c.completion_score ? ` (${c.completion_score}% complete)` : ''}
                        {getExistingForCandidate(c.id) ? ' ✓ assessed' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCandidate && getExistingForCandidate(selectedCandidate) && (
                  <p className="text-sm text-[#F59E0B]">
                    ⚠ An assessment already exists for this candidate. Running again will create a new one.
                  </p>
                )}

                <button
                  onClick={runAssessment}
                  disabled={isAssessing || !selectedCandidate}
                  className="px-6 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isAssessing ? 'Running...' : 'Run Fit Assessment'}
                </button>
              </div>
            )}
          </div>

          {/* Loading state */}
          {isAssessing && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
              <div className="inline-block w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-700 font-medium">{LOADING_MESSAGES[loadingMsg]}</p>
              <p className="text-slate-400 text-sm mt-1">This takes 15–30 seconds</p>
            </div>
          )}

          {/* Assessment result */}
          {currentAssessment && !isAssessing && (
            <FitReport
              assessment={currentAssessment.assessment}
              assessmentId={currentAssessment.id}
            />
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {existingAssessments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
              <p className="text-slate-400">No assessments run yet</p>
            </div>
          ) : (
            existingAssessments.map(a => (
              <HistoryCard key={a.id} assessment={a} candidates={candidates} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function HistoryCard({ assessment, candidates }: { assessment: Assessment; candidates: Candidate[] }) {
  const [expanded, setExpanded] = useState(false)
  const candidate = candidates.find(c => c.id === assessment.candidate_profile_id)
  const score = assessment.overall_fit_score
  const scoreColor = score >= 80 ? 'text-[#10B981]' : score >= 60 ? 'text-[#F59E0B]' : 'text-[#EF4444]'

  const recLabels: Record<string, string> = {
    strong_yes: 'Strong Yes',
    yes: 'Yes',
    maybe: 'Maybe',
    no: 'No',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div
        className="p-5 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4">
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {candidate?.title || 'Unknown candidate'}
            </p>
            <p className="text-xs text-slate-400">
              {recLabels[assessment.recommendation] ?? assessment.recommendation} —{' '}
              {new Date(assessment.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && assessment.assessment_data && (
        <div className="border-t border-slate-100 p-5">
          <FitReport
            assessment={assessment.assessment_data}
            assessmentId={assessment.id}
            existingRating={assessment.recruiter_rating}
          />
        </div>
      )}
    </div>
  )
}

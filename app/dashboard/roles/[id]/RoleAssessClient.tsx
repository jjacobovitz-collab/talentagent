'use client'

import { useState } from 'react'
import FitReport from '@/components/FitReport'
import Link from 'next/link'
import toast from 'react-hot-toast'

const LOADING_MESSAGES = [
  'Reading your profile...',
  'Analyzing technical fit...',
  'Evaluating role alignment...',
  'Generating assessment...',
]

export default function RoleAssessClient({
  agentId,
  candidateProfile,
  existingAssessment,
}: {
  agentId: string
  candidateProfile: { id: string; title: string | null; completion_score: number | null } | null
  existingAssessment: any
}) {
  const [isAssessing, setIsAssessing] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [assessment, setAssessment] = useState<any>(existingAssessment?.assessment_data ?? null)
  const [assessmentId, setAssessmentId] = useState<string | null>(existingAssessment?.id ?? null)

  const runAssessment = async () => {
    if (!candidateProfile) return

    setIsAssessing(true)
    setLoadingMsg(0)

    const interval = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)

    try {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAgentId: agentId,
          candidateProfileId: candidateProfile.id,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error ?? 'Assessment failed')
        return
      }

      setAssessment(data.assessment)
      setAssessmentId(data.id)
      toast.success('Assessment complete!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      clearInterval(interval)
      setIsAssessing(false)
    }
  }

  if (!candidateProfile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
        <p className="text-slate-500 text-sm mb-3">Build your profile to get assessed for this role.</p>
        <Link
          href="/dashboard/profile"
          className="inline-block bg-[#6366F1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
        >
          Build Profile
        </Link>
      </div>
    )
  }

  if ((candidateProfile.completion_score ?? 0) < 30) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
        <p className="text-slate-500 text-sm mb-1">Your profile is {candidateProfile.completion_score ?? 0}% complete.</p>
        <p className="text-slate-400 text-xs mb-3">Complete more sections for a meaningful assessment.</p>
        <Link
          href="/dashboard/profile"
          className="inline-block bg-[#6366F1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
        >
          Continue Profile
        </Link>
      </div>
    )
  }

  if (isAssessing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-700 font-medium text-sm">{LOADING_MESSAGES[loadingMsg]}</p>
        <p className="text-slate-400 text-xs mt-1">15–30 seconds</p>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
        <p className="text-sm font-medium text-slate-700 mb-1">{candidateProfile.title || 'Your Profile'}</p>
        <p className="text-slate-400 text-xs mb-4">{candidateProfile.completion_score ?? 0}% complete</p>
        <button
          onClick={runAssessment}
          className="w-full bg-[#6366F1] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
        >
          Check My Fit
        </button>
      </div>
    )
  }

  const score = assessment.overall_fit_score
  const scoreColor = score >= 80 ? 'text-[#10B981]' : score >= 60 ? 'text-[#F59E0B]' : 'text-[#EF4444]'

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 text-center">
        <p className="text-sm text-slate-500 mb-1">Your Fit Score</p>
        <p className={`text-5xl font-bold ${scoreColor}`}>{score}</p>
        <button
          onClick={runAssessment}
          className="mt-4 w-full border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:border-[#6366F1] hover:text-[#6366F1] transition-colors"
        >
          Re-assess
        </button>
      </div>
      <FitReport assessment={assessment} assessmentId={assessmentId ?? undefined} />
    </div>
  )
}

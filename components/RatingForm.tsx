'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface RatingFormProps {
  matchId: string
  ratingStage: 'post_reveal' | 'post_conversation' | 'post_process'
  role: 'candidate' | 'recruiter'
}

export default function RatingForm({ matchId, ratingStage, role }: RatingFormProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [overallQuality, setOverallQuality] = useState(0)
  const [assessmentAccuracy, setAssessmentAccuracy] = useState(0)
  const [skillsAccuracy, setSkillsAccuracy] = useState(0)
  const [profileHonesty, setProfileHonesty] = useState(0)
  const [cultureAccuracy, setCultureAccuracy] = useState(0)
  const [roleAccuracy, setRoleAccuracy] = useState(0)
  const [whatAccurate, setWhatAccurate] = useState('')
  const [whatInaccurate, setWhatInaccurate] = useState('')
  const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null)

  const stageLabel = {
    post_reveal: 'Before your conversation — was our summary accurate?',
    post_conversation: 'After your conversation — how did it go?',
    post_process: 'Process complete — final feedback',
  }[ratingStage]

  const handleSubmit = async () => {
    if (!overallQuality) { toast.error('Please rate overall match quality'); return }
    setSubmitting(true)

    const ratings: any = { overall_match_quality: overallQuality, assessment_accuracy: assessmentAccuracy }
    if (role === 'recruiter') {
      ratings.skills_accuracy = skillsAccuracy
      ratings.profile_honesty = profileHonesty
    } else {
      ratings.company_culture_accuracy = cultureAccuracy
      ratings.role_accuracy = roleAccuracy
    }

    try {
      const res = await fetch('/api/ratings/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          ratingStage,
          ratings,
          qualitative: {
            what_was_accurate: whatAccurate || null,
            what_was_inaccurate: whatInaccurate || null,
            would_use_again: wouldUseAgain,
          },
        }),
      })

      if (res.ok) { setSubmitted(true); toast.success('Feedback saved. Thank you!') }
      else toast.error('Failed to save feedback')
    } catch { toast.error('Failed to save feedback') }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-[#10B981]">✓ Feedback submitted</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full text-center text-xs text-slate-400 hover:text-[#6366F1] border border-dashed border-slate-200 rounded-lg py-2 transition-colors">
        Leave feedback on this match
      </button>
    )
  }

  function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex gap-1">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button" onClick={() => onChange(s)}
            className={`text-xl transition-colors ${value >= s ? 'text-[#F59E0B]' : 'text-slate-200 hover:text-[#F59E0B]'}`}>
            ★
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="border border-slate-100 rounded-lg p-4 bg-slate-50 space-y-4">
      <p className="text-xs font-medium text-slate-600">{stageLabel}</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Overall match quality</span>
          <Stars value={overallQuality} onChange={setOverallQuality} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Assessment accuracy</span>
          <Stars value={assessmentAccuracy} onChange={setAssessmentAccuracy} />
        </div>
        {role === 'recruiter' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Skills matched assessment?</span>
              <Stars value={skillsAccuracy} onChange={setSkillsAccuracy} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Profile honesty</span>
              <Stars value={profileHonesty} onChange={setProfileHonesty} />
            </div>
          </>
        )}
        {role === 'candidate' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Culture accurately described?</span>
              <Stars value={cultureAccuracy} onChange={setCultureAccuracy} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Role matched description?</span>
              <Stars value={roleAccuracy} onChange={setRoleAccuracy} />
            </div>
          </>
        )}
      </div>

      <input type="text" value={whatAccurate} onChange={e => setWhatAccurate(e.target.value)}
        placeholder="What was most accurate?" className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#6366F1]" />
      <input type="text" value={whatInaccurate} onChange={e => setWhatInaccurate(e.target.value)}
        placeholder="What surprised you?" className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#6366F1]" />

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-600">Would use again?</span>
        <div className="flex gap-2">
          {[true, false].map(v => (
            <button key={String(v)} type="button" onClick={() => setWouldUseAgain(v)}
              className={`px-3 py-1 rounded text-xs border transition-colors ${wouldUseAgain === v ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#6366F1]' : 'border-slate-200 text-slate-600'}`}>
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={submitting}
          className="flex-1 bg-[#6366F1] text-white py-2 rounded-lg text-xs font-medium hover:bg-[#5558e8] disabled:opacity-60 transition-colors">
          {submitting ? 'Saving...' : 'Submit — 30 seconds, helps everyone'}
        </button>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs px-3">
          Skip
        </button>
      </div>
    </div>
  )
}

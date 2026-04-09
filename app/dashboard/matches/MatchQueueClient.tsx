'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FitReport from '@/components/FitReport'
import RatingForm from '@/components/RatingForm'
import toast from 'react-hot-toast'
import { generateCandidateAlias, isRevealed } from '@/lib/utils/anonymize'

interface Match {
  id: string
  match_status: string
  overall_fit_score: number
  technical_fit_score: number
  recommendation: string
  recommendation_summary: string
  candidate_confirmation_status: string
  company_confirmation_status: string
  fit_report: any
  revealed_at: string | null
  candidate_confirmed_at: string | null
  job_postings: any
  candidate_profiles: any
  cross_reference?: {
    consistency_score: number | null
    consistency_rating: string | null
    cross_reference_summary: string | null
    timeline_analysis: any[]
    questions_to_ask: string[]
  } | null
}

const COLUMNS = [
  { key: 'pending', label: 'Pending Review', statuses: ['pending_candidate', 'assessed', 'candidate_confirmed'] },
  { key: 'waiting', label: 'Waiting on Candidate', statuses: ['company_confirmed'] },
  { key: 'revealed', label: 'Mutual Confirmed', statuses: ['mutual_confirmed', 'revealed'] },
  { key: 'conversation', label: 'In Conversation', statuses: ['in_conversation', 'offer_made'] },
]

export default function MatchQueueClient({ matches }: { matches: Match[]; recruiterId: string }) {
  const router = useRouter()
  const [localMatches, setLocalMatches] = useState(matches)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [atsConnections, setAtsConnections] = useState<{ ats_type: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('ats_connections').select('ats_type').eq('is_active', true).then(({ data }) => {
      if (data) setAtsConnections(data)
    })
  }, [])

  const handleConfirm = async (matchId: string, action: 'confirm' | 'dismiss') => {
    setConfirming(matchId)
    try {
      const res = await fetch('/api/matches/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, action, side: 'company' }),
      })
      const data = await res.json()
      if (data.success) {
        setLocalMatches(prev => prev.map(m =>
          m.id === matchId
            ? { ...m, match_status: data.status, company_confirmation_status: action === 'confirm' ? 'confirmed' : 'dismissed' }
            : m
        ))
        if (action === 'confirm') toast.success('Confirmed. If candidate also confirms, both are revealed.')
        else toast.success('Match dismissed.')
        router.refresh()
      } else {
        toast.error('Action failed')
      }
    } catch {
      toast.error('Action failed')
    }
    setConfirming(null)
  }

  const getColumn = (match: Match) => {
    for (const col of COLUMNS) {
      if (col.statuses.includes(match.match_status)) return col.key
    }
    return 'pending'
  }

  return (
    <div className="grid grid-cols-4 gap-4 min-h-96">
      {COLUMNS.map(col => {
        const colMatches = localMatches.filter(m => getColumn(m) === col.key)
        return (
          <div key={col.key} className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">{col.label}</h2>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{colMatches.length}</span>
            </div>

            <div className="space-y-3">
              {colMatches.map(match => (
                <KanbanCard
                  key={match.id}
                  match={match}
                  column={col.key}
                  expanded={expanded === match.id}
                  onToggle={() => setExpanded(expanded === match.id ? null : match.id)}
                  onConfirm={handleConfirm}
                  confirming={confirming === match.id}
                  atsConnections={atsConnections}
                />
              ))}

              {colMatches.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">Empty</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProfileVerification({ match, fullReveal }: { match: Match; fullReveal: boolean }) {
  const [showDetails, setShowDetails] = useState(false)
  const githubStrength = match.candidate_profiles?.github_strength ?? match.fit_report?.technical_fit_score ?? null
  const linkedinScore = match.cross_reference?.consistency_score ?? null
  const combinedScore = githubStrength != null && linkedinScore != null
    ? Math.round((githubStrength * 10 + linkedinScore) / 2)
    : null

  const summary = match.cross_reference?.cross_reference_summary
    ?? (githubStrength != null ? `GitHub strength: ${githubStrength}/10` : 'Verification data not yet available')

  if (githubStrength == null && linkedinScore == null) return null

  return (
    <div className="bg-slate-50 rounded-lg p-3 mt-2 border border-slate-100">
      <p className="text-xs font-semibold text-slate-600 mb-2">Profile Verification</p>
      <div className="flex items-center gap-3 mb-2">
        {githubStrength != null && (
          <div className="text-center">
            <p className="text-xs text-slate-400">GitHub</p>
            <p className="text-sm font-bold text-[#0F172A]">{githubStrength}/10</p>
          </div>
        )}
        {linkedinScore != null && (
          <div className="text-center">
            <p className="text-xs text-slate-400">LinkedIn</p>
            <p className="text-sm font-bold text-[#0F172A]">{linkedinScore}/100</p>
          </div>
        )}
        {combinedScore != null && (
          <div className="text-center ml-auto">
            <p className="text-xs text-slate-400">Combined</p>
            <p className={`text-sm font-bold ${combinedScore >= 80 ? 'text-[#10B981]' : combinedScore >= 60 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
              {combinedScore}%
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{summary}</p>

      {fullReveal && match.cross_reference && (
        <div className="mt-2">
          <button
            onClick={() => setShowDetails(d => !d)}
            className="text-xs text-[#6366F1] hover:underline"
          >
            {showDetails ? '▲ Hide details' : '▼ Show timeline & questions'}
          </button>
          {showDetails && (
            <div className="mt-2 space-y-3">
              {match.cross_reference.timeline_analysis?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Timeline</p>
                  <div className="space-y-1">
                    {match.cross_reference.timeline_analysis.slice(0, 5).map((t: any, i: number) => (
                      <div key={i} className="text-xs text-slate-600 bg-white rounded p-2 border border-slate-100">
                        <span className="font-medium">{t.period}:</span> {t.notes || t.github_evidence}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {match.cross_reference.questions_to_ask?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Suggested questions</p>
                  <ul className="space-y-1">
                    {match.cross_reference.questions_to_ask.map((q: string, i: number) => (
                      <li key={i} className="text-xs text-slate-600 flex gap-1">
                        <span className="text-[#6366F1] shrink-0">{i + 1}.</span> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KanbanCard({ match, column, expanded, onToggle, onConfirm, confirming, atsConnections }: {
  match: Match
  column: string
  expanded: boolean
  onToggle: () => void
  onConfirm: (id: string, action: 'confirm' | 'dismiss') => void
  confirming: boolean
  atsConnections: { ats_type: string }[]
}) {
  const [atsPushed, setAtsPushed] = useState<string | null>(null)
  const [atsPushing, setAtsPushing] = useState(false)

  const handleAtsPush = async (atsType: string) => {
    setAtsPushing(true)
    try {
      const res = await fetch('/api/ats/push-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, atsType })
      })
      if (res.ok) {
        setAtsPushed(atsType)
        toast.success(`Candidate added to ${atsType === 'greenhouse' ? 'Greenhouse' : 'Lever'}`)
      } else {
        toast.error('Failed to push to ATS')
      }
    } catch {
      toast.error('Failed to push to ATS')
    } finally {
      setAtsPushing(false)
    }
  }
  const job = match.job_postings
  const candidate = match.candidate_profiles
  const revealed = isRevealed(match.match_status)
  const score = match.overall_fit_score

  const candidateDisplay = revealed
    ? `${candidate?.title || 'Engineer'} · ${candidate?.years_of_experience || '?'} yrs`
    : generateCandidateAlias(match.id)

  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {candidateDisplay}
            </p>
            <p className="text-xs text-slate-400 truncate">{job?.title}</p>
          </div>
          <span className={`text-lg font-bold ml-2 ${score >= 80 ? 'text-[#10B981]' : score >= 60 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>{score}</span>
        </div>

        {match.recommendation_summary && (
          <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
            {match.recommendation_summary}
          </p>
        )}

        {/* Candidate confirmation indicator */}
        <div className="flex items-center gap-1 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            match.candidate_confirmation_status === 'confirmed' ? 'bg-[#10B981]/10 text-[#10B981]' :
            match.candidate_confirmation_status === 'dismissed' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
            'bg-slate-100 text-slate-500'
          }`}>
            Candidate: {match.candidate_confirmation_status}
          </span>
        </div>

        {/* Actions */}
        {column === 'pending' && match.company_confirmation_status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={() => onConfirm(match.id, 'confirm')} disabled={confirming}
              className="flex-1 bg-[#6366F1] text-white py-1.5 rounded text-xs font-medium hover:bg-[#5558e8] disabled:opacity-60 transition-colors">
              Confirm
            </button>
            <button onClick={() => onConfirm(match.id, 'dismiss')} disabled={confirming}
              className="flex-1 border border-slate-200 text-slate-500 py-1.5 rounded text-xs hover:border-slate-300 disabled:opacity-60 transition-colors">
              Dismiss
            </button>
          </div>
        )}

        {revealed && (
          <div className="space-y-2 mt-2">
            <div className="bg-[#10B981]/5 rounded p-2">
              <p className="text-xs text-[#10B981] font-medium">✓ Revealed</p>
              {candidate?.profiles?.full_name && (
                <p className="text-xs text-slate-700 mt-0.5">{candidate.profiles.full_name}</p>
              )}
              {candidate?.profiles?.email && (
                <a href={`mailto:${candidate.profiles.email}`} className="text-xs text-[#6366F1] hover:underline">
                  {candidate.profiles.email}
                </a>
              )}
            </div>
            <ProfileVerification match={match} fullReveal={true} />
            {atsConnections.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {atsPushed ? (
                  <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-3 py-1 rounded-full font-medium">
                    ✓ Added to {atsPushed === 'greenhouse' ? 'Greenhouse' : 'Lever'}
                  </span>
                ) : (
                  atsConnections.map(conn => (
                    <button
                      key={conn.ats_type}
                      onClick={() => handleAtsPush(conn.ats_type)}
                      disabled={atsPushing}
                      className="text-xs border border-slate-200 text-slate-600 px-3 py-1 rounded-full hover:border-slate-400 disabled:opacity-50 transition-colors"
                    >
                      {atsPushing ? 'Pushing...' : `Push to ${conn.ats_type === 'greenhouse' ? 'Greenhouse' : 'Lever'}`}
                    </button>
                  ))
                )}
              </div>
            )}
            <RatingForm matchId={match.id} ratingStage="post_reveal" role="recruiter" />
          </div>
        )}

        <button onClick={onToggle} className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? '▲ Hide' : '▼ Full report'}
        </button>
      </div>

      {expanded && match.fit_report && (
        <div className="border-t border-slate-100 p-4 max-h-96 overflow-y-auto">
          <FitReport assessment={match.fit_report} />
        </div>
      )}
    </div>
  )
}

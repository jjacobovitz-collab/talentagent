'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

function KanbanCard({ match, column, expanded, onToggle, onConfirm, confirming }: {
  match: Match
  column: string
  expanded: boolean
  onToggle: () => void
  onConfirm: (id: string, action: 'confirm' | 'dismiss') => void
  confirming: boolean
}) {
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FitReport from '@/components/FitReport'
import RatingForm from '@/components/RatingForm'
import toast from 'react-hot-toast'
import { generateCompanyAlias, isRevealed } from '@/lib/utils/anonymize'

interface Match {
  id: string
  match_status: string
  overall_fit_score: number
  recommendation: string
  recommendation_summary: string
  candidate_confirmation_status: string
  company_confirmation_status: string
  fit_report: any
  outreach_email_draft: string | null
  revealed_at: string | null
  job_postings: any
  trust_score?: { average_rating: number; total_ratings: number; ratings_threshold_met: boolean } | null
}


function scoreBg(score: number) {
  if (score >= 80) return 'bg-[#10B981]'
  if (score >= 60) return 'bg-[#F59E0B]'
  return 'bg-[#EF4444]'
}

const recLabels: Record<string, string> = {
  strong_yes: 'Strong Match',
  yes: 'Good Match',
  maybe: 'Possible Match',
  no: 'Weak Match',
}

export default function OpportunitiesFeed({ matches, githubConnected }: { matches: Match[]; githubConnected: boolean }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'strong' | 'good' | 'maybe'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [localMatches, setLocalMatches] = useState(matches)
  const [confirming, setConfirming] = useState<string | null>(null)

  if (!githubConnected) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="font-semibold text-[#0F172A] text-lg mb-2">Connect GitHub to activate your agent</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
          Your agent needs to analyze your GitHub work to find meaningful matches.
        </p>
        <Link href="/dashboard/github" className="inline-block bg-[#6366F1] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors">
          Connect GitHub
        </Link>
      </div>
    )
  }

  const filtered = localMatches.filter(m => {
    if (filter === 'strong') return m.overall_fit_score >= 80
    if (filter === 'good') return m.overall_fit_score >= 60 && m.overall_fit_score < 80
    if (filter === 'maybe') return m.overall_fit_score < 60
    return true
  })

  const handleConfirm = async (matchId: string, action: 'confirm' | 'dismiss') => {
    setConfirming(matchId)
    try {
      const res = await fetch('/api/matches/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, action, side: 'candidate' }),
      })
      const data = await res.json()
      if (data.success) {
        setLocalMatches(prev => prev.map(m =>
          m.id === matchId
            ? { ...m, match_status: data.status, candidate_confirmation_status: action === 'confirm' ? 'confirmed' : 'dismissed' }
            : m
        ))
        if (action === 'confirm') toast.success('Interest confirmed. Waiting for the hiring team.')
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

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `All (${localMatches.length})` },
          { key: 'strong', label: `Strong 80+` },
          { key: 'good', label: `Good 60-79` },
          { key: 'maybe', label: `Maybe <60` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === key ? 'bg-[#6366F1] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#6366F1]'}`}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-400 text-lg mb-2">No matches yet</p>
          <p className="text-slate-400 text-sm">Your agent is actively searching. We&apos;ll notify you when strong matches are found.</p>
        </div>
      )}

      {filtered.map(match => (
        <MatchCard
          key={match.id}
          match={match}
          expanded={expanded === match.id}
          onToggleExpand={() => setExpanded(expanded === match.id ? null : match.id)}
          onConfirm={handleConfirm}
          confirming={confirming === match.id}
        />
      ))}
    </div>
  )
}

function MatchCard({ match, expanded, onToggleExpand, onConfirm, confirming }: {
  match: Match
  expanded: boolean
  onToggleExpand: () => void
  onConfirm: (id: string, action: 'confirm' | 'dismiss') => void
  confirming: boolean
}) {
  const job = match.job_postings
  const revealed = isRevealed(match.match_status)
  const candidateConfirmed = match.candidate_confirmation_status === 'confirmed'
  const dismissed = match.candidate_confirmation_status === 'dismissed' || match.match_status === 'candidate_dismissed'
  const [showOutreach, setShowOutreach] = useState(false)
  const [outreachDraft, setOutreachDraft] = useState(match.outreach_email_draft || '')
  const [loadingDraft, setLoadingDraft] = useState(false)

  const loadDraft = async () => {
    if (outreachDraft) { setShowOutreach(true); return }
    setLoadingDraft(true)
    const res = await fetch('/api/outreach/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id }),
    })
    const data = await res.json()
    if (data.draft) { setOutreachDraft(data.draft); setShowOutreach(true) }
    setLoadingDraft(false)
  }

  if (dismissed) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 opacity-50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Not a match — dismissed</span>
          <button onClick={onToggleExpand} className="text-xs text-slate-400 hover:text-slate-600">
            {expanded ? 'Hide details' : 'See what didn\'t align'}
          </button>
        </div>
        {expanded && match.fit_report && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <FitReport assessment={match.fit_report} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-colors ${revealed ? 'border-[#10B981]/30' : 'border-slate-100'}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${scoreBg(match.overall_fit_score)}`}>
              {match.overall_fit_score}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-[#0F172A]">{job?.title || 'Unknown Role'}</h3>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                  {recLabels[match.recommendation] || match.recommendation}
                </span>
              </div>
              <p className="text-slate-500 text-sm">
                {revealed
                  ? <span className="font-medium text-[#10B981]">{job?.company_name}</span>
                  : <span className="text-slate-400 italic">{generateCompanyAlias(job?.id || match.id)}</span>
                }
                {job?.location && ` · ${job.location}`}
                {job?.remote_type && job.remote_type !== 'unknown' && ` · ${job.remote_type}`}
              </p>
              {match.trust_score?.ratings_threshold_met && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {'★'.repeat(Math.round(match.trust_score.average_rating))}{'☆'.repeat(5 - Math.round(match.trust_score.average_rating))}{' '}
                  {match.trust_score.average_rating.toFixed(1)} ({match.trust_score.total_ratings} reviews)
                </p>
              )}
            </div>
          </div>

          {/* Status badge */}
          {revealed ? (
            <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] text-xs font-semibold rounded-full border border-[#10B981]/20">
              ✓ Revealed
            </span>
          ) : candidateConfirmed ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-medium rounded-full border border-[#F59E0B]/20">
              <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full animate-pulse" />
              Waiting for hiring team
            </div>
          ) : null}
        </div>

        {/* Summary */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {match.recommendation_summary}
        </p>

        {/* Green flags */}
        {match.fit_report?.green_flags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {match.fit_report.green_flags.slice(0, 3).map((flag: any, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-[#10B981]/10 text-[#10B981] text-xs rounded-full">
                ✓ {flag.flag}
              </span>
            ))}
          </div>
        )}

        {/* Comp */}
        {(job?.parsed_requirements?.comp_min || job?.parsed_requirements?.comp_max) && (
          <p className="text-xs text-slate-400 mb-4">
            ${job.parsed_requirements.comp_min ? (job.parsed_requirements.comp_min / 1000).toFixed(0) + 'k' : '?'}
            {' – '}
            ${job.parsed_requirements.comp_max ? (job.parsed_requirements.comp_max / 1000).toFixed(0) + 'k' : '?'}
          </p>
        )}

        {/* Actions */}
        {!candidateConfirmed && !dismissed && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => onConfirm(match.id, 'confirm')}
                disabled={confirming}
                className="flex-1 bg-[#10B981] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0d9e6e] disabled:opacity-60 transition-colors"
              >
                {confirming ? 'Confirming...' : "I'm interested"}
              </button>
              <button
                onClick={() => onConfirm(match.id, 'dismiss')}
                disabled={confirming}
                className="px-5 border border-slate-200 text-slate-500 rounded-lg text-sm hover:border-slate-300 disabled:opacity-60 transition-colors"
              >
                Not for me
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">
              If you confirm and the hiring team also confirms, you&apos;ll both be introduced.
            </p>
          </div>
        )}

        {revealed && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="bg-[#10B981]/5 rounded-lg p-4">
              <p className="text-sm font-semibold text-[#10B981] mb-1">Mutual interest confirmed</p>
              <p className="text-sm text-slate-700">Company: <strong>{job?.company_name}</strong></p>
            </div>
            <button onClick={loadDraft} disabled={loadingDraft}
              className="w-full border border-[#6366F1] text-[#6366F1] py-2.5 rounded-lg text-sm font-medium hover:bg-[#6366F1]/5 disabled:opacity-60 transition-colors">
              {loadingDraft ? 'Generating draft...' : 'Review outreach draft'}
            </button>
            {showOutreach && outreachDraft && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Introduction email draft</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{outreachDraft}</p>
              </div>
            )}
            <RatingForm matchId={match.id} ratingStage="post_reveal" role="candidate" />
          </div>
        )}

        {/* Expand for full report */}
        <button onClick={onToggleExpand} className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors">
          {expanded ? '▲ Hide assessment' : '▼ See full assessment'}
        </button>
      </div>

      {expanded && match.fit_report && (
        <div className="border-t border-slate-100 p-6">
          <FitReport assessment={match.fit_report} />
        </div>
      )}
    </div>
  )
}

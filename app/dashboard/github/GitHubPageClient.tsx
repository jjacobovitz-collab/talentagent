'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface GitHubProfile {
  id: string
  github_username: string
  public_repos_count: number
  followers: number
  ingestion_status: 'pending' | 'ingesting' | 'complete' | 'failed'
  ingestion_completed_at: string | null
  last_synced_at: string | null
  technical_fingerprint: any
  repos_analyzed: any[]
}

export default function GitHubPageClient({ githubProfile }: { githubProfile: GitHubProfile | null }) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      if (res.ok) {
        toast.success('Re-sync started. This takes 5-10 minutes.')
      } else {
        toast.error('Sync failed')
      }
    } catch {
      toast.error('Sync failed')
    }
    setSyncing(false)
  }

  if (!githubProfile) {
    return (
      <div className="space-y-6">
        <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-6">
          <h2 className="font-semibold text-[#0F172A] mb-3">Privacy First</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              'We only read public repositories',
              'We never write to your GitHub',
              'You can disconnect at any time and all GitHub data is deleted',
              'Your code is never stored — only our analysis of it',
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-[#10B981]">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="text-5xl mb-4">🐙</div>
          <h2 className="font-semibold text-[#0F172A] text-lg mb-2">Connect your GitHub</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Your agent analyzes your repositories to build a technical fingerprint — your actual skills from real code, not self-reporting.
          </p>
          <a
            href="/api/github/connect"
            className="inline-block bg-[#0F172A] text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Connect GitHub
          </a>
        </div>
      </div>
    )
  }

  const { ingestion_status, technical_fingerprint: fp } = githubProfile

  if (ingestion_status === 'ingesting' || ingestion_status === 'pending') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-semibold text-[#0F172A] mb-2">Analyzing your repositories</h2>
        <p className="text-slate-500 text-sm">This takes 5-10 minutes. We&apos;ll notify you when complete.</p>
        <p className="text-slate-400 text-xs mt-2">Connected as <strong>@{githubProfile.github_username}</strong></p>
      </div>
    )
  }

  if (ingestion_status === 'failed') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="font-semibold text-[#0F172A] mb-2">Analysis failed</h2>
        <p className="text-slate-500 text-sm mb-4">Something went wrong. Try syncing again.</p>
        <button onClick={handleSync} disabled={syncing}
          className="bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-60">
          {syncing ? 'Starting...' : 'Retry Analysis'}
        </button>
      </div>
    )
  }

  // Complete
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-[#0F172A]">@{githubProfile.github_username}</h2>
            <p className="text-slate-500 text-sm">
              {githubProfile.public_repos_count} public repos · {githubProfile.followers} followers
            </p>
          </div>
          <div className="flex items-center gap-3">
            {githubProfile.last_synced_at && (
              <p className="text-slate-400 text-xs">
                Synced {new Date(githubProfile.last_synced_at).toLocaleDateString()}
              </p>
            )}
            <button onClick={handleSync} disabled={syncing}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-[#6366F1] hover:text-[#6366F1] transition-colors disabled:opacity-60">
              {syncing ? 'Starting...' : 'Re-sync'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#10B981] rounded-full" />
          <span className="text-sm text-[#10B981] font-medium">Analysis complete</span>
        </div>
      </div>

      {fp && (
        <>
          {fp.summary && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-[#0F172A] mb-2">Technical Summary</h3>
              <p className="text-slate-700 text-sm leading-relaxed">{fp.summary}</p>
              {fp.seniority_estimate && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Estimated seniority:</span>
                  <span className="px-2 py-0.5 bg-[#6366F1]/10 text-[#6366F1] text-xs rounded-full capitalize">{fp.seniority_estimate}</span>
                </div>
              )}
            </div>
          )}

          {fp.primary_languages?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-[#0F172A] mb-4">Top Languages</h3>
              <div className="space-y-3">
                {fp.primary_languages.slice(0, 6).map((lang: any) => (
                  <div key={lang.language}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">{lang.language}</span>
                      <span className="text-xs text-slate-500 capitalize">{lang.estimated_proficiency} · {lang.recency}</span>
                    </div>
                    {lang.proficiency_evidence && (
                      <p className="text-xs text-slate-400 italic">{lang.proficiency_evidence}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fp.standout_projects?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-[#0F172A] mb-4">Standout Projects</h3>
              <div className="space-y-4">
                {fp.standout_projects.map((proj: any) => (
                  <div key={proj.name} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-slate-800 text-sm">{proj.name}</h4>
                      <span className="text-xs text-[#6366F1]">Depth: {proj.technical_depth_score}/10</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{proj.description}</p>
                    <p className="text-xs text-[#10B981]">{proj.why_notable}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fp.skill_trajectory && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-semibold text-[#0F172A] mb-2">Skill Trajectory</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`capitalize font-medium text-sm ${
                  fp.skill_trajectory.direction === 'improving' ? 'text-[#10B981]' :
                  fp.skill_trajectory.direction === 'declining' ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                }`}>{fp.skill_trajectory.direction}</span>
              </div>
              {fp.skill_trajectory.notable_recent_work && (
                <p className="text-sm text-slate-600">{fp.skill_trajectory.notable_recent_work}</p>
              )}
            </div>
          )}

          {fp.honest_gaps?.length > 0 && (
            <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl p-5">
              <h3 className="font-semibold text-[#F59E0B] mb-3 text-sm">Honest Gaps (from GitHub analysis)</h3>
              <ul className="space-y-1">
                {fp.honest_gaps.map((gap: string, i: number) => (
                  <li key={i} className="text-sm text-slate-700">• {gap}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

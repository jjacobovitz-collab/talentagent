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
  repos_analyzed: any
}

// ─── Rating helpers ───────────────────────────────────────────────────────────

const qualityColors: Record<string, string> = {
  excellent: 'bg-[#10B981]/10 text-[#10B981]',
  good:      'bg-[#10B981]/10 text-[#10B981]',
  strong:    'bg-[#10B981]/10 text-[#10B981]',
  significant:'bg-[#10B981]/10 text-[#10B981]',
  fair:      'bg-[#F59E0B]/10 text-[#F59E0B]',
  moderate:  'bg-[#F59E0B]/10 text-[#F59E0B]',
  minimal:   'bg-[#F59E0B]/10 text-[#F59E0B]',
  mixed:     'bg-[#F59E0B]/10 text-[#F59E0B]',
  poor:      'bg-[#EF4444]/10 text-[#EF4444]',
  none:      'bg-[#EF4444]/10 text-[#EF4444]',
  declining: 'bg-[#EF4444]/10 text-[#EF4444]',
  improving: 'bg-[#10B981]/10 text-[#10B981]',
  consistent:'bg-[#6366F1]/10 text-[#6366F1]',
  high:      'bg-[#10B981]/10 text-[#10B981]',
  medium:    'bg-[#F59E0B]/10 text-[#F59E0B]',
  low:       'bg-[#EF4444]/10 text-[#EF4444]',
  deep:      'bg-[#10B981]/10 text-[#10B981]',
  surface:   'bg-[#F59E0B]/10 text-[#F59E0B]',
}

function RatingBadge({ value }: { value: string }) {
  const key = value?.toLowerCase().split(' ')[0] ?? ''
  const colors = qualityColors[key] ?? 'bg-slate-100 text-slate-500'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors}`}>
      {value}
    </span>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-semibold text-[#0F172A] mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Evidence({ text }: { text: string | null | undefined }) {
  if (!text) return null
  return <p className="text-xs text-slate-400 italic mt-0.5">{text}</p>
}

// ─── Section components ───────────────────────────────────────────────────────

function TopLanguages({ fp }: { fp: any }) {
  const langs: any[] = fp.primary_languages ?? []
  if (!langs.length) return null

  const proficiencyOrder = ['expert', 'advanced', 'intermediate', 'beginner']
  const sorted = [...langs].sort((a, b) =>
    proficiencyOrder.indexOf(a.estimated_proficiency) - proficiencyOrder.indexOf(b.estimated_proficiency)
  )

  return (
    <SectionCard title="Primary Languages">
      <div className="space-y-4">
        {sorted.slice(0, 8).map((lang: any) => (
          <div key={lang.language} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#0F172A]">{lang.language}</span>
                {lang.repo_count != null && (
                  <span className="text-xs text-slate-400">{lang.repo_count} repo{lang.repo_count !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RatingBadge value={lang.estimated_proficiency} />
                <span className="text-xs text-slate-400 capitalize">{lang.recency}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {lang.production_evidence === true && (
                <span className="text-xs text-[#10B981] font-medium">✓ Production evidence</span>
              )}
              {lang.production_evidence === false && (
                <span className="text-xs text-slate-400">No production evidence detected</span>
              )}
            </div>
            <Evidence text={lang.proficiency_evidence} />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function ProductionEvidence({ fp }: { fp: any }) {
  const langs: any[] = fp.primary_languages ?? []
  const frameworks: any[] = fp.frameworks_detected ?? []
  const patterns: any[] = fp.architecture_patterns ?? []

  const prodLangs = langs.filter(l => l.production_evidence === true)
  const infraKeywords = ['ci', 'cd', 'docker', 'kubernetes', 'k8s', 'terraform', 'helm', 'aws', 'gcp', 'azure', 'deploy', 'infra', 'pipeline', 'actions', 'workflow']
  const infraFrameworks = frameworks.filter(f =>
    infraKeywords.some(k => f.name?.toLowerCase().includes(k))
  )
  const infraPatterns = patterns.filter(p =>
    infraKeywords.some(k =>
      p.pattern?.toLowerCase().includes(k) || p.description?.toLowerCase().includes(k)
    )
  )

  const hasAnything = prodLangs.length || infraFrameworks.length || infraPatterns.length

  return (
    <SectionCard title="Production Evidence">
      {!hasAnything ? (
        <p className="text-sm text-slate-400 italic">No clear production signals detected from GitHub data.</p>
      ) : (
        <div className="space-y-4">
          {prodLangs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Languages with production use</p>
              <div className="flex flex-wrap gap-2">
                {prodLangs.map((l: any) => (
                  <span key={l.language} className="px-2.5 py-1 bg-[#10B981]/8 border border-[#10B981]/20 rounded-lg text-xs font-medium text-[#10B981]">
                    {l.language}
                  </span>
                ))}
              </div>
            </div>
          )}
          {infraFrameworks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">CI/CD &amp; infrastructure tools</p>
              <div className="space-y-2">
                {infraFrameworks.map((f: any) => (
                  <div key={f.name} className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-sm font-medium text-slate-700">{f.name}</span>
                      {f.evidence_repos?.length > 0 && (
                        <p className="text-xs text-slate-400 italic mt-0.5">Seen in: {f.evidence_repos.join(', ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <RatingBadge value={f.usage_depth} />
                      <RatingBadge value={f.confidence + ' conf.'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {infraPatterns.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Deployment patterns</p>
              <div className="space-y-2">
                {infraPatterns.map((p: any) => (
                  <div key={p.pattern}>
                    <p className="text-sm font-medium text-slate-700">{p.pattern}</p>
                    {p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
                    <Evidence text={p.evidence} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {fp.overall_github_strength != null && (
            <div className="pt-3 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Overall GitHub Strength</span>
                <span className="text-sm font-semibold text-[#0F172A]">{fp.overall_github_strength}/10</span>
              </div>
              {fp.confidence_in_assessment && (
                <p className="text-xs text-slate-400 mt-1">
                  Assessment confidence: <span className="capitalize">{fp.confidence_in_assessment}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

function SkillTrajectory({ fp }: { fp: any }) {
  const traj = fp.skill_trajectory
  if (!traj) return null

  const directionIcon: Record<string, string> = {
    improving: '↑',
    consistent: '→',
    mixed: '~',
    declining: '↓',
    insufficient_data: '?',
  }

  return (
    <SectionCard title="Skill Trajectory">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{directionIcon[traj.direction] ?? '?'}</span>
          <RatingBadge value={traj.direction?.replace('_', ' ')} />
        </div>
      </div>
      {traj.notable_recent_work && (
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Working on right now</p>
          <p className="text-sm text-slate-700">{traj.notable_recent_work}</p>
        </div>
      )}
      {traj.evidence && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Evidence</p>
          <p className="text-xs text-slate-500 italic">{traj.evidence}</p>
        </div>
      )}
    </SectionCard>
  )
}

function StandoutProjects({ fp }: { fp: any }) {
  const projects: any[] = fp.standout_projects ?? []
  if (!projects.length) return null

  return (
    <SectionCard title="Standout Projects">
      <div className="space-y-4">
        {projects.map((proj: any) => (
          <div key={proj.name} className="border border-slate-100 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {proj.url ? (
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#0F172A] text-sm hover:text-[#6366F1] transition-colors"
                  >
                    {proj.name} ↗
                  </a>
                ) : (
                  <span className="font-semibold text-[#0F172A] text-sm">{proj.name}</span>
                )}
              </div>
              <span className="shrink-0 text-xs font-medium text-[#6366F1] bg-[#6366F1]/10 px-2 py-0.5 rounded-full">
                depth {proj.technical_depth_score}/10
              </span>
            </div>
            {proj.description && (
              <p className="text-sm text-slate-600 mb-2">{proj.description}</p>
            )}
            {proj.why_notable && (
              <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded px-3 py-2 mb-2">
                <p className="text-xs font-medium text-[#10B981] mb-0.5">Why technically notable</p>
                <p className="text-xs text-slate-700">{proj.why_notable}</p>
              </div>
            )}
            {proj.most_relevant_for_roles?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {proj.most_relevant_for_roles.map((role: string) => (
                  <span key={role} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function CodeQuality({ fp }: { fp: any }) {
  const cq = fp.code_quality_signals
  if (!cq) return null

  const dimensions = [
    { label: 'Documentation habit', rating: cq.documentation_quality, evidence: cq.documentation_evidence },
    { label: 'Test discipline',      rating: cq.test_coverage_signals, evidence: cq.test_evidence },
    { label: 'Commit consistency',   rating: cq.commit_message_quality, evidence: cq.commit_evidence },
    { label: 'Code organization',    rating: cq.code_organization,      evidence: cq.organization_evidence },
  ]

  return (
    <SectionCard title="Code Quality">
      {cq.overall_quality_score != null && (
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
          <span className="text-2xl font-bold text-[#0F172A]">{cq.overall_quality_score}</span>
          <span className="text-slate-400 text-sm">/ 10 overall</span>
        </div>
      )}
      <div className="space-y-4">
        {dimensions.map(({ label, rating, evidence }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              {rating && <RatingBadge value={rating} />}
            </div>
            <Evidence text={evidence} />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function CollaborationSignals({ fp }: { fp: any }) {
  const collab = fp.collaboration_signals
  if (!collab) return null

  return (
    <SectionCard title="Collaboration Signals">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-medium text-slate-700">Open source contributions</span>
            {collab.open_source_contributions && <RatingBadge value={collab.open_source_contributions} />}
          </div>
          <Evidence text={collab.contribution_evidence} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-medium text-slate-700">PR quality</span>
            {collab.pr_quality && <RatingBadge value={collab.pr_quality?.replace('_', ' ')} />}
          </div>
          <Evidence text={collab.pr_evidence} />
        </div>
      </div>
    </SectionCard>
  )
}

function HonestGaps({ fp }: { fp: any }) {
  const gaps: string[] = fp.honest_gaps ?? []
  const redFlags: string[] = fp.red_flags ?? []
  if (!gaps.length && !redFlags.length) return null

  return (
    <div className="space-y-4">
      {gaps.length > 0 && (
        <div className="bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl p-5">
          <h3 className="font-semibold text-[#F59E0B] mb-3 text-sm">Honest Gaps</h3>
          <p className="text-xs text-slate-500 mb-3">
            Missing from the GitHub evidence — not necessarily missing skills, but not verifiable from code alone.
          </p>
          <ul className="space-y-2">
            {gaps.map((gap, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-[#F59E0B] shrink-0 mt-0.5">•</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
      {redFlags.length > 0 && (
        <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-5">
          <h3 className="font-semibold text-[#EF4444] mb-3 text-sm">Concerns</h3>
          <ul className="space-y-2">
            {redFlags.map((flag, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-[#EF4444] shrink-0 mt-0.5">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface CrossReference {
  consistency_score: number | null
  consistency_rating: string | null
  cross_reference_summary: string | null
}

function LinkedInCrossRefTeaser({ crossReference }: { crossReference: CrossReference | null }) {
  if (!crossReference || crossReference.consistency_score == null) {
    return (
      <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#0F172A]">Add LinkedIn to cross-reference your employment history</p>
          <p className="text-xs text-slate-500 mt-0.5">See how your GitHub activity corroborates your LinkedIn claims</p>
        </div>
        <a
          href="/dashboard/linkedin"
          className="shrink-0 text-sm font-medium text-[#6366F1] hover:underline whitespace-nowrap"
        >
          Add LinkedIn →
        </a>
      </div>
    )
  }

  const score = crossReference.consistency_score
  const color = score >= 85 ? '#10B981' : score >= 70 ? '#6366F1' : score >= 50 ? '#F59E0B' : '#EF4444'
  const label = score >= 85 ? 'Strong' : score >= 70 ? 'Good' : score >= 50 ? 'Mixed' : 'Weak'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <span className="text-2xl font-bold" style={{ color }}>{score}</span>
            <p className="text-xs font-medium" style={{ color }}>{label}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">LinkedIn Consistency Score</p>
            {crossReference.cross_reference_summary && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{crossReference.cross_reference_summary}</p>
            )}
          </div>
        </div>
        <a
          href="/dashboard/linkedin"
          className="shrink-0 text-sm font-medium text-[#6366F1] hover:underline whitespace-nowrap"
        >
          View full analysis →
        </a>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GitHubPageClient({
  githubProfile,
  crossReference = null,
}: {
  githubProfile: GitHubProfile | null
  crossReference?: CrossReference | null
}) {
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

  // ── Complete state ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
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
          {/* Summary + seniority */}
          {(fp.summary || fp.seniority_estimate) && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-semibold text-[#0F172A]">Technical Summary</h3>
                {fp.seniority_estimate && (
                  <div className="shrink-0 text-right">
                    <span className="px-3 py-1 bg-[#6366F1]/10 text-[#6366F1] text-xs font-semibold rounded-full capitalize">
                      {fp.seniority_estimate}
                    </span>
                  </div>
                )}
              </div>
              {fp.summary && (
                <p className="text-slate-700 text-sm leading-relaxed mb-3">{fp.summary}</p>
              )}
              {fp.strongest_use_case && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Best suited for:</span> {fp.strongest_use_case}
                </p>
              )}
              {fp.seniority_evidence && (
                <p className="text-xs text-slate-400 italic mt-1">{fp.seniority_evidence}</p>
              )}
            </div>
          )}

          {/* Languages */}
          <TopLanguages fp={fp} />

          {/* Frameworks detected */}
          {fp.frameworks_detected?.length > 0 && (
            <SectionCard title="Frameworks & Tools Detected">
              <div className="space-y-3">
                {fp.frameworks_detected.map((f: any) => (
                  <div key={f.name} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{f.name}</p>
                      {f.evidence_repos?.length > 0 && (
                        <p className="text-xs text-slate-400 italic mt-0.5">
                          Seen in: {f.evidence_repos.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <RatingBadge value={f.usage_depth} />
                      <RatingBadge value={f.confidence} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Production Evidence */}
          <ProductionEvidence fp={fp} />

          {/* Skill Trajectory */}
          <SkillTrajectory fp={fp} />

          {/* Standout Projects */}
          <StandoutProjects fp={fp} />

          {/* Code Quality */}
          <CodeQuality fp={fp} />

          {/* Collaboration Signals */}
          <CollaborationSignals fp={fp} />

          {/* Honest Gaps */}
          <HonestGaps fp={fp} />

          {/* LinkedIn Cross-Reference Teaser */}
          <LinkedInCrossRefTeaser crossReference={crossReference} />
        </>
      )}
    </div>
  )
}

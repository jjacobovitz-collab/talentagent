'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface SystemBuilt {
  name: string
  description: string
  scale: string
  architecture_decisions: string
  would_do_differently: string
}

interface HardProblem {
  problem: string
  what_made_it_hard: string
  how_resolved: string
  outcome: string
}

interface SkillRating {
  skill: string
  rating: number
}

interface ProfileData {
  // Basics
  title: string
  years_experience: number | string
  languages: string[]
  frameworks: string[]
  cloud_platforms: string[]
  // Skill assessments
  skill_ratings: SkillRating[]
  // Systems built
  systems_built: SystemBuilt[]
  // Hardest problems
  hardest_problems: HardProblem[]
  // Honest self assessment
  genuine_strengths: string
  genuine_gaps: string
  problems_interest: string
  // Work preferences
  remote_preference: string
  company_stage: string[]
  team_size: string
  engineering_culture: string
  management_style: string
  // Role requirements
  target_roles: string[]
  industries: string[]
  comp_min: number | string
  comp_max: number | string
  visa_status: string
  availability: string
  dealbreakers: string
  optimizing_for: string
}

const SECTIONS = [
  'Basics',
  'Skill Assessment',
  'Systems Built',
  'Hardest Problems',
  'Honest Self Assessment',
  'Work Preferences',
  'Role Requirements',
]

const defaultProfile: ProfileData = {
  title: '',
  years_experience: '',
  languages: [],
  frameworks: [],
  cloud_platforms: [],
  skill_ratings: [],
  systems_built: [{ name: '', description: '', scale: '', architecture_decisions: '', would_do_differently: '' }],
  hardest_problems: [{ problem: '', what_made_it_hard: '', how_resolved: '', outcome: '' }],
  genuine_strengths: '',
  genuine_gaps: '',
  problems_interest: '',
  remote_preference: '',
  company_stage: [],
  team_size: '',
  engineering_culture: '',
  management_style: '',
  target_roles: [],
  industries: [],
  comp_min: '',
  comp_max: '',
  visa_status: '',
  availability: '',
  dealbreakers: '',
  optimizing_for: '',
}

function calcScore(data: ProfileData): number {
  let score = 0
  if (data.title && data.years_experience) score += 10
  if (data.languages.length > 0 || data.frameworks.length > 0) score += 15
  if (data.skill_ratings.length > 0) score += 10
  if (data.systems_built.filter(s => s.name).length >= 2) score += 25
  if (data.hardest_problems.filter(p => p.problem).length >= 1) score += 15
  if (data.genuine_strengths && data.genuine_gaps) score += 10
  if (data.remote_preference || data.company_stage.length > 0) score += 10
  if (data.target_roles.length > 0 || data.visa_status) score += 5
  return score
}

function TagInput({ label, value, onChange, placeholder }: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-[#6366F1]/10 text-[#6366F1] px-3 py-1 rounded-full text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter(t => t !== tag))}
              className="hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add()
            }
          }}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default function CandidateProfileForm({
  userId,
  initialData,
}: {
  userId: string
  initialData: any
}) {
  const [activeSection, setActiveSection] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const [data, setData] = useState<ProfileData>(() => {
    if (!initialData) return defaultProfile
    return {
      ...defaultProfile,
      ...initialData,
      languages: initialData.languages ?? [],
      frameworks: initialData.frameworks ?? [],
      cloud_platforms: initialData.cloud_platforms ?? [],
      skill_ratings: initialData.skill_ratings ?? [],
      systems_built: initialData.systems_built?.length > 0
        ? initialData.systems_built
        : defaultProfile.systems_built,
      hardest_problems: initialData.hardest_problems?.length > 0
        ? initialData.hardest_problems
        : defaultProfile.hardest_problems,
      company_stage: initialData.company_stage ?? [],
      target_roles: initialData.target_roles ?? [],
      industries: initialData.industries ?? [],
    }
  })

  const save = useCallback(async (d: ProfileData) => {
    setSaveStatus('saving')
    const supabase = createClient()
    const score = calcScore(d)

    const { error } = await supabase.from('candidate_profiles').upsert({
      user_id: userId,
      ...d,
      completion_score: score,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      toast.error('Save failed: ' + error.message)
      setSaveStatus('idle')
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }, [userId])

  const updateData = useCallback((updates: Partial<ProfileData>) => {
    setData(prev => {
      const next = { ...prev, ...updates }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(next), 500)
      return next
    })
  }, [save])

  // Sync skill ratings when languages change
  useEffect(() => {
    const existing = data.skill_ratings
    const newRatings = data.languages.map(lang => {
      const found = existing.find(r => r.skill === lang)
      return found ?? { skill: lang, rating: 3 }
    })
    if (JSON.stringify(newRatings) !== JSON.stringify(existing)) {
      setData(prev => ({ ...prev, skill_ratings: newRatings }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.languages])

  const score = calcScore(data)

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Profile Completion</span>
          <div className="flex items-center gap-3">
            {saveStatus !== 'idle' && (
              <span className={`text-xs ${saveStatus === 'saving' ? 'text-slate-400' : 'text-[#10B981]'}`}>
                {saveStatus === 'saving' ? '● Saving...' : '✓ Saved'}
              </span>
            )}
            <span className="text-sm font-bold text-[#6366F1]">{score}/100</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-[#6366F1] h-2 rounded-full transition-all duration-500"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => setActiveSection(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === i
                ? 'bg-[#6366F1] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-[#6366F1] hover:text-[#6366F1]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        {activeSection === 0 && <BasicsSection data={data} onChange={updateData} />}
        {activeSection === 1 && <SkillAssessmentSection data={data} onChange={updateData} />}
        {activeSection === 2 && <SystemsBuiltSection data={data} onChange={updateData} />}
        {activeSection === 3 && <HardestProblemsSection data={data} onChange={updateData} />}
        {activeSection === 4 && <HonestSelfAssessmentSection data={data} onChange={updateData} />}
        {activeSection === 5 && <WorkPreferencesSection data={data} onChange={updateData} />}
        {activeSection === 6 && <RoleRequirementsSection data={data} onChange={updateData} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setActiveSection(s => Math.max(0, s - 1))}
          disabled={activeSection === 0}
          className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => setActiveSection(s => Math.min(SECTIONS.length - 1, s + 1))}
          disabled={activeSection === SECTIONS.length - 1}
          className="px-6 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next Section
        </button>
      </div>
    </div>
  )
}

function field(label: string, children: React.ReactNode) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function inputClass() {
  return 'w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm'
}

function textareaClass() {
  return 'w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm resize-none'
}

// ─── Section Components ───────────────────────────────────────────────────────

function BasicsSection({ data, onChange }: { data: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0F172A]">Basics</h2>
      {field('Current / desired title', (
        <input
          type="text"
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          className={inputClass()}
          placeholder="Senior Software Engineer"
        />
      ))}
      {field('Years of experience', (
        <input
          type="number"
          value={data.years_experience}
          onChange={e => onChange({ years_experience: e.target.value })}
          className={inputClass()}
          placeholder="5"
          min={0}
        />
      ))}
      <TagInput
        label="Programming languages"
        value={data.languages}
        onChange={v => onChange({ languages: v })}
        placeholder="e.g. TypeScript, Python"
      />
      <TagInput
        label="Frameworks & libraries"
        value={data.frameworks}
        onChange={v => onChange({ frameworks: v })}
        placeholder="e.g. React, FastAPI"
      />
      <TagInput
        label="Cloud platforms"
        value={data.cloud_platforms}
        onChange={v => onChange({ cloud_platforms: v })}
        placeholder="e.g. AWS, GCP"
      />
    </div>
  )
}

function SkillAssessmentSection({ data, onChange }: { data: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  if (data.languages.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[#0F172A]">Skill Honest Assessment</h2>
        <p className="text-slate-500 text-sm">Add languages in the Basics section first, then rate your proficiency here.</p>
      </div>
    )
  }

  const updateRating = (skill: string, rating: number) => {
    const updated = data.skill_ratings.map(r =>
      r.skill === skill ? { ...r, rating } : r
    )
    onChange({ skill_ratings: updated })
  }

  const labels = ['', 'Beginner', 'Familiar', 'Proficient', 'Advanced', 'Expert']

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0F172A]">Skill Honest Assessment</h2>
      <p className="text-slate-500 text-sm">Be honest. Inflated ratings hurt matching.</p>
      {data.skill_ratings.map(({ skill, rating }) => (
        <div key={skill} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-700">{skill}</span>
            <span className="text-sm text-[#6366F1] font-medium">{labels[rating]}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={rating}
            onChange={e => updateRating(skill, parseInt(e.target.value))}
            className="w-full accent-[#6366F1]"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>Beginner</span>
            <span>Expert</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SystemsBuiltSection({ data, onChange }: { data: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  const systems = data.systems_built

  const updateSystem = (i: number, updates: Partial<SystemBuilt>) => {
    const next = systems.map((s, idx) => idx === i ? { ...s, ...updates } : s)
    onChange({ systems_built: next })
  }

  const addSystem = () => {
    if (systems.length >= 5) return
    onChange({
      systems_built: [...systems, { name: '', description: '', scale: '', architecture_decisions: '', would_do_differently: '' }]
    })
  }

  const removeSystem = (i: number) => {
    onChange({ systems_built: systems.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0F172A]">Systems Built</h2>
        <span className="text-sm text-slate-500">{systems.length}/5</span>
      </div>
      <p className="text-slate-500 text-sm -mt-4">Describe up to 5 significant systems you&apos;ve built or contributed to.</p>

      {systems.map((s, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">System {i + 1}</span>
            {systems.length > 1 && (
              <button
                type="button"
                onClick={() => removeSystem(i)}
                className="text-slate-400 hover:text-red-500 text-sm"
              >
                Remove
              </button>
            )}
          </div>
          {field('System name', (
            <input
              type="text"
              value={s.name}
              onChange={e => updateSystem(i, { name: e.target.value })}
              className={inputClass()}
              placeholder="Distributed job scheduler"
            />
          ))}
          {field('Description', (
            <textarea
              value={s.description}
              onChange={e => updateSystem(i, { description: e.target.value })}
              className={textareaClass()}
              rows={3}
              placeholder="What does it do, why does it exist?"
            />
          ))}
          {field('Scale', (
            <input
              type="text"
              value={s.scale}
              onChange={e => updateSystem(i, { scale: e.target.value })}
              className={inputClass()}
              placeholder="10M req/day, 50 engineers, $5M ARR"
            />
          ))}
          {field('Key architecture decisions', (
            <textarea
              value={s.architecture_decisions}
              onChange={e => updateSystem(i, { architecture_decisions: e.target.value })}
              className={textareaClass()}
              rows={3}
              placeholder="Why Kafka? Why Postgres over MongoDB? Microservices vs monolith?"
            />
          ))}
          {field('What would you do differently?', (
            <textarea
              value={s.would_do_differently}
              onChange={e => updateSystem(i, { would_do_differently: e.target.value })}
              className={textareaClass()}
              rows={2}
              placeholder="Be honest — no system is perfect"
            />
          ))}
        </div>
      ))}

      {systems.length < 5 && (
        <button
          type="button"
          onClick={addSystem}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-4 text-slate-400 hover:border-[#6366F1] hover:text-[#6366F1] text-sm font-medium transition-colors"
        >
          + Add another system
        </button>
      )}
    </div>
  )
}

function HardestProblemsSection({ data, onChange }: { data: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  const problems = data.hardest_problems

  const updateProblem = (i: number, updates: Partial<HardProblem>) => {
    const next = problems.map((p, idx) => idx === i ? { ...p, ...updates } : p)
    onChange({ hardest_problems: next })
  }

  const addProblem = () => {
    if (problems.length >= 2) return
    onChange({
      hardest_problems: [...problems, { problem: '', what_made_it_hard: '', how_resolved: '', outcome: '' }]
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0F172A]">Hardest Problems</h2>
        <span className="text-sm text-slate-500">{problems.length}/2</span>
      </div>
      <p className="text-slate-500 text-sm -mt-4">The hardest technical problems you&apos;ve solved. Be specific.</p>

      {problems.map((p, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-5 space-y-4">
          <span className="font-medium text-slate-700">Problem {i + 1}</span>
          {field('The problem', (
            <textarea
              value={p.problem}
              onChange={e => updateProblem(i, { problem: e.target.value })}
              className={textareaClass()}
              rows={2}
              placeholder="Briefly describe the problem"
            />
          ))}
          {field('What made it hard?', (
            <textarea
              value={p.what_made_it_hard}
              onChange={e => updateProblem(i, { what_made_it_hard: e.target.value })}
              className={textareaClass()}
              rows={2}
              placeholder="Technical complexity, organizational, scale, time pressure?"
            />
          ))}
          {field('How you resolved it', (
            <textarea
              value={p.how_resolved}
              onChange={e => updateProblem(i, { how_resolved: e.target.value })}
              className={textareaClass()}
              rows={3}
              placeholder="Your actual approach"
            />
          ))}
          {field('Outcome', (
            <input
              type="text"
              value={p.outcome}
              onChange={e => updateProblem(i, { outcome: e.target.value })}
              className={inputClass()}
              placeholder="What was the result?"
            />
          ))}
        </div>
      ))}

      {problems.length < 2 && (
        <button
          type="button"
          onClick={addProblem}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-4 text-slate-400 hover:border-[#6366F1] hover:text-[#6366F1] text-sm font-medium transition-colors"
        >
          + Add another problem
        </button>
      )}
    </div>
  )
}

function HonestSelfAssessmentSection({ data, onChange }: { data: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0F172A]">Honest Self Assessment</h2>
      <p className="text-slate-500 text-sm">The more honest you are, the better your matches will be.</p>
      {field('Genuine strengths', (
        <textarea
          value={data.genuine_strengths}
          onChange={e => onChange({ genuine_strengths: e.target.value })}
          className={textareaClass()}
          rows={4}
          placeholder="What do you genuinely do better than most engineers at your level? Be specific, not generic."
        />
      ))}
      {field('Genuine gaps', (
        <textarea
          value={data.genuine_gaps}
          onChange={e => onChange({ genuine_gaps: e.target.value })}
          className={textareaClass()}
          rows={4}
          placeholder="What are you still learning? What do you avoid or find difficult? Be real."
        />
      ))}
      {field('What problems interest you', (
        <textarea
          value={data.problems_interest}
          onChange={e => onChange({ problems_interest: e.target.value })}
          className={textareaClass()}
          rows={3}
          placeholder="What kinds of problems get you excited to go to work?"
        />
      ))}
    </div>
  )
}

function WorkPreferencesSection({ data, onChange }: { data: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  const stageOptions = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public', 'Enterprise']

  const toggleStage = (stage: string) => {
    const next = data.company_stage.includes(stage)
      ? data.company_stage.filter(s => s !== stage)
      : [...data.company_stage, stage]
    onChange({ company_stage: next })
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0F172A]">Work Preferences</h2>
      {field('Remote preference', (
        <select
          value={data.remote_preference}
          onChange={e => onChange({ remote_preference: e.target.value })}
          className={inputClass()}
        >
          <option value="">Select...</option>
          <option>Fully remote</option>
          <option>Hybrid (1-2 days)</option>
          <option>Hybrid (3+ days)</option>
          <option>In-office</option>
          <option>Flexible</option>
        </select>
      ))}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Company stage</label>
        <div className="flex flex-wrap gap-2">
          {stageOptions.map(stage => (
            <button
              key={stage}
              type="button"
              onClick={() => toggleStage(stage)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                data.company_stage.includes(stage)
                  ? 'bg-[#6366F1] text-white border-[#6366F1]'
                  : 'border-slate-200 text-slate-600 hover:border-[#6366F1]'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {field('Team size preference', (
        <select
          value={data.team_size}
          onChange={e => onChange({ team_size: e.target.value })}
          className={inputClass()}
        >
          <option value="">Select...</option>
          <option>1-5 people</option>
          <option>6-15 people</option>
          <option>16-50 people</option>
          <option>50+ people</option>
          <option>No preference</option>
        </select>
      ))}

      {field('Engineering culture you thrive in', (
        <textarea
          value={data.engineering_culture}
          onChange={e => onChange({ engineering_culture: e.target.value })}
          className={textareaClass()}
          rows={3}
          placeholder="Fast-paced shipping? Rigorous code review? Autonomous ownership? Strong testing culture?"
        />
      ))}

      {field('Preferred management style', (
        <select
          value={data.management_style}
          onChange={e => onChange({ management_style: e.target.value })}
          className={inputClass()}
        >
          <option value="">Select...</option>
          <option>Highly autonomous — set direction, get out of my way</option>
          <option>Collaborative — frequent check-ins and feedback</option>
          <option>Coaching-focused — regular 1:1s and growth plans</option>
          <option>Results-oriented — clear goals, flexible how</option>
        </select>
      ))}
    </div>
  )
}

function RoleRequirementsSection({ data, onChange }: { data: ProfileData; onChange: (u: Partial<ProfileData>) => void }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[#0F172A]">Role Requirements</h2>
      <TagInput
        label="Target roles"
        value={data.target_roles}
        onChange={v => onChange({ target_roles: v })}
        placeholder="e.g. Staff Engineer, EM"
      />
      <TagInput
        label="Industries of interest"
        value={data.industries}
        onChange={v => onChange({ industries: v })}
        placeholder="e.g. Fintech, Healthcare"
      />
      <div className="grid grid-cols-2 gap-4">
        {field('Comp min ($/yr)', (
          <input
            type="number"
            value={data.comp_min}
            onChange={e => onChange({ comp_min: e.target.value })}
            className={inputClass()}
            placeholder="180000"
          />
        ))}
        {field('Comp max ($/yr)', (
          <input
            type="number"
            value={data.comp_max}
            onChange={e => onChange({ comp_max: e.target.value })}
            className={inputClass()}
            placeholder="250000"
          />
        ))}
      </div>
      {field('Visa status', (
        <select
          value={data.visa_status}
          onChange={e => onChange({ visa_status: e.target.value })}
          className={inputClass()}
        >
          <option value="">Select...</option>
          <option>US Citizen / Green Card</option>
          <option>H1B (needs transfer)</option>
          <option>OPT/CPT</option>
          <option>TN Visa</option>
          <option>Other — needs sponsorship</option>
          <option>No sponsorship needed</option>
        </select>
      ))}
      {field('Availability', (
        <select
          value={data.availability}
          onChange={e => onChange({ availability: e.target.value })}
          className={inputClass()}
        >
          <option value="">Select...</option>
          <option>Immediately available</option>
          <option>2 weeks notice</option>
          <option>1 month notice</option>
          <option>2+ months notice</option>
          <option>Passively looking</option>
        </select>
      ))}
      {field('Dealbreakers', (
        <textarea
          value={data.dealbreakers}
          onChange={e => onChange({ dealbreakers: e.target.value })}
          className={textareaClass()}
          rows={2}
          placeholder="Things that would immediately rule out a role"
        />
      ))}
      {field('What are you optimizing for in your next role?', (
        <textarea
          value={data.optimizing_for}
          onChange={e => onChange({ optimizing_for: e.target.value })}
          className={textareaClass()}
          rows={3}
          placeholder="Compensation? Equity? Growth? Impact? Learning? Work-life balance?"
        />
      ))}
    </div>
  )
}

'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const SECTIONS = [
  'Company Basics',
  'Tech Stack',
  'Engineering Culture',
  'Fit Signals',
  'Compensation & Benefits',
  'Interview Process',
  'Agent Instructions',
]

interface InterviewStage {
  stage_name: string
  description: string
  what_assessing: string
  duration_minutes: number | string
}

interface FormData {
  company_name: string
  company_website: string
  company_size: string
  company_stage: string
  industry: string
  headquarters: string
  founded_year: string
  core_languages: string[]
  core_frameworks: string[]
  core_infrastructure: string[]
  core_tools: string[]
  crm_and_business_tools: string[]
  engineering_values: string
  engineering_culture: string
  deployment_frequency: string
  oncall_expectations: string
  code_review_culture: string
  architecture_philosophy: string
  traits_of_successful_engineers: string
  traits_that_struggle_here: string
  why_engineers_join: string
  why_engineers_leave: string
  base_comp_philosophy: string
  equity_structure: string
  health_benefits: string
  pto_policy: string
  remote_policy: string
  learning_and_development: string
  other_benefits: string
  interview_process_overview: string
  typical_timeline: string
  interview_stages: InterviewStage[]
  always_emphasize: string
  never_misrepresent: string
}

const emptyForm: FormData = {
  company_name: '', company_website: '', company_size: '', company_stage: '',
  industry: '', headquarters: '', founded_year: '',
  core_languages: [], core_frameworks: [], core_infrastructure: [], core_tools: [], crm_and_business_tools: [],
  engineering_values: '', engineering_culture: '', deployment_frequency: '',
  oncall_expectations: '', code_review_culture: '', architecture_philosophy: '',
  traits_of_successful_engineers: '', traits_that_struggle_here: '',
  why_engineers_join: '', why_engineers_leave: '',
  base_comp_philosophy: '', equity_structure: '', health_benefits: '',
  pto_policy: '', remote_policy: '', learning_and_development: '', other_benefits: '',
  interview_process_overview: '', typical_timeline: '',
  interview_stages: [{ stage_name: '', description: '', what_assessing: '', duration_minutes: '' }],
  always_emphasize: '', never_misrepresent: '',
}

function ic() { return 'w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm' }
function tc() { return 'w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm resize-none' }

function TagInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const t = input.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput('')
  }
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-[#6366F1]/10 text-[#6366F1] px-3 py-1 rounded-full text-sm">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm" placeholder={placeholder} />
        <button type="button" onClick={add} className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">Add</button>
      </div>
    </div>
  )
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

export default function CompanyProfileForm({ recruiterId, initialData, companyId }: { recruiterId: string; initialData?: any; companyId?: string }) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const [form, setForm] = useState<FormData>(() => ({
    ...emptyForm,
    ...(initialData || {}),
    core_languages: initialData?.core_languages || [],
    core_frameworks: initialData?.core_frameworks || [],
    core_infrastructure: initialData?.core_infrastructure || [],
    core_tools: initialData?.core_tools || [],
    crm_and_business_tools: initialData?.crm_and_business_tools || [],
    interview_stages: initialData?.interview_stages?.length > 0
      ? initialData.interview_stages
      : emptyForm.interview_stages,
  }))
  const [companyId_, setCompanyId] = useState(companyId)

  const save = useCallback(async (d: FormData) => {
    setSaveStatus('saving')
    const supabase = createClient()
    const payload = { ...d, recruiter_id: recruiterId, founded_year: d.founded_year ? parseInt(d.founded_year as string) : null }

    let error
    if (companyId_) {
      const res = await supabase.from('company_profiles').update(payload).eq('id', companyId_)
      error = res.error
    } else {
      const res = await supabase.from('company_profiles').insert(payload).select().single()
      error = res.error
      if (!error && res.data) setCompanyId(res.data.id)
    }

    if (error) { toast.error('Save failed'); setSaveStatus('idle') }
    else { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) }
  }, [recruiterId, companyId_])

  const update = useCallback((updates: Partial<FormData>) => {
    setForm(prev => {
      const next = { ...prev, ...updates }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(next), 500)
      return next
    })
  }, [save])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
        <span className="text-sm text-slate-600">Company Profile</span>
        {saveStatus !== 'idle' && (
          <span className={`text-xs ${saveStatus === 'saving' ? 'text-slate-400' : 'text-[#10B981]'}`}>
            {saveStatus === 'saving' ? '● Saving...' : '✓ Saved'}
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {SECTIONS.map((s, i) => (
          <button key={s} onClick={() => setActiveSection(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === i ? 'bg-[#6366F1] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#6366F1] hover:text-[#6366F1]'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        {activeSection === 0 && (
          <>
            <h2 className="text-lg font-semibold text-[#0F172A]">Company Basics</h2>
            <F label="Company name *"><input type="text" value={form.company_name} onChange={e => update({ company_name: e.target.value })} className={ic()} placeholder="Acme Corp" /></F>
            <F label="Website"><input type="text" value={form.company_website} onChange={e => update({ company_website: e.target.value })} className={ic()} placeholder="https://acme.com" /></F>
            <div className="grid grid-cols-2 gap-4">
              <F label="Company size">
                <select value={form.company_size} onChange={e => update({ company_size: e.target.value })} className={ic()}>
                  <option value="">Select...</option>
                  {['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map(s => <option key={s}>{s}</option>)}
                </select>
              </F>
              <F label="Stage">
                <select value={form.company_stage} onChange={e => update({ company_stage: e.target.value })} className={ic()}>
                  <option value="">Select...</option>
                  {['seed', 'series_a', 'series_b', 'series_c', 'growth', 'public'].map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </F>
            </div>
            <F label="Industry"><input type="text" value={form.industry} onChange={e => update({ industry: e.target.value })} className={ic()} placeholder="Fintech, SaaS, Healthcare..." /></F>
            <F label="Headquarters"><input type="text" value={form.headquarters} onChange={e => update({ headquarters: e.target.value })} className={ic()} placeholder="San Francisco, CA" /></F>
            <F label="Year founded"><input type="number" value={form.founded_year} onChange={e => update({ founded_year: e.target.value })} className={ic()} placeholder="2018" /></F>
          </>
        )}

        {activeSection === 1 && (
          <>
            <h2 className="text-lg font-semibold text-[#0F172A]">Tech Stack</h2>
            <p className="text-slate-500 text-sm -mt-3">Add everything engineers actually use, not just what&apos;s in job descriptions.</p>
            <TagInput label="Core programming languages" value={form.core_languages} onChange={v => update({ core_languages: v })} placeholder="Python, Go, TypeScript..." />
            <TagInput label="Frameworks & libraries" value={form.core_frameworks} onChange={v => update({ core_frameworks: v })} placeholder="React, FastAPI, Kubernetes..." />
            <TagInput label="Infrastructure & DevOps" value={form.core_infrastructure} onChange={v => update({ core_infrastructure: v })} placeholder="AWS, Postgres, Redis..." />
            <TagInput label="Internal tools" value={form.core_tools} onChange={v => update({ core_tools: v })} placeholder="Datadog, PagerDuty, GitHub..." />
            <TagInput label="Business tools" value={form.crm_and_business_tools} onChange={v => update({ crm_and_business_tools: v })} placeholder="Salesforce, Jira, Notion..." />
          </>
        )}

        {activeSection === 2 && (
          <>
            <h2 className="text-lg font-semibold text-[#0F172A]">Engineering Culture</h2>
            <p className="text-slate-500 text-sm -mt-3">Be honest. Candidates whose culture fits stay longer and perform better.</p>
            <F label="Engineering values" hint="What does your engineering org genuinely believe?"><textarea value={form.engineering_values} onChange={e => update({ engineering_values: e.target.value })} className={tc()} rows={3} placeholder="We believe in..." /></F>
            <F label="Day-to-day culture" hint="Describe a typical week for an engineer here"><textarea value={form.engineering_culture} onChange={e => update({ engineering_culture: e.target.value })} className={tc()} rows={3} placeholder="Teams are small and autonomous..." /></F>
            <F label="Deployment frequency"><input type="text" value={form.deployment_frequency} onChange={e => update({ deployment_frequency: e.target.value })} className={ic()} placeholder="Multiple times per day" /></F>
            <F label="Oncall expectations"><textarea value={form.oncall_expectations} onChange={e => update({ oncall_expectations: e.target.value })} className={tc()} rows={2} placeholder="~2 incidents/week on rotation, P0 requires immediate response..." /></F>
            <F label="Code review culture"><textarea value={form.code_review_culture} onChange={e => update({ code_review_culture: e.target.value })} className={tc()} rows={2} placeholder="Thorough reviews, 2 approvals required..." /></F>
            <F label="Architecture philosophy"><textarea value={form.architecture_philosophy} onChange={e => update({ architecture_philosophy: e.target.value })} className={tc()} rows={2} placeholder="Service-oriented, pragmatic about tech debt..." /></F>
          </>
        )}

        {activeSection === 3 && (
          <>
            <h2 className="text-lg font-semibold text-[#0F172A]">Fit Signals</h2>
            <p className="text-slate-500 text-sm -mt-3">The most valuable section for matching. Be direct.</p>
            <F label="Traits of engineers who thrive here" hint="Be specific. What have your best hires had in common?"><textarea value={form.traits_of_successful_engineers} onChange={e => update({ traits_of_successful_engineers: e.target.value })} className={tc()} rows={4} placeholder="Self-directed, comfortable with ambiguity, strong written communication..." /></F>
            <F label="Traits of engineers who struggle here" hint="Honest filtering saves everyone's time"><textarea value={form.traits_that_struggle_here} onChange={e => update({ traits_that_struggle_here: e.target.value })} className={tc()} rows={3} placeholder="Need heavy PM guidance, prefer large established codebases..." /></F>
            <F label="Why engineers join" hint="Real reasons, not the press release"><textarea value={form.why_engineers_join} onChange={e => update({ why_engineers_join: e.target.value })} className={tc()} rows={3} placeholder="Strong equity upside, direct impact on product..." /></F>
            <F label="Why engineers leave" hint="Be honest — candidates will find out"><textarea value={form.why_engineers_leave} onChange={e => update({ why_engineers_leave: e.target.value })} className={tc()} rows={3} placeholder="Oncall burden, limited upward mobility after Series B..." /></F>
          </>
        )}

        {activeSection === 4 && (
          <>
            <h2 className="text-lg font-semibold text-[#0F172A]">Compensation & Benefits</h2>
            <F label="Compensation philosophy"><textarea value={form.base_comp_philosophy} onChange={e => update({ base_comp_philosophy: e.target.value })} className={tc()} rows={2} placeholder="Top of market cash, equity-heavy..." /></F>
            <F label="Equity structure"><textarea value={form.equity_structure} onChange={e => update({ equity_structure: e.target.value })} className={tc()} rows={2} placeholder="ISOs, 4yr vest 1yr cliff, typical grant $300k-$500k..." /></F>
            <F label="Health benefits"><textarea value={form.health_benefits} onChange={e => update({ health_benefits: e.target.value })} className={tc()} rows={2} placeholder="100% covered medical/dental/vision for employee..." /></F>
            <F label="PTO policy"><input type="text" value={form.pto_policy} onChange={e => update({ pto_policy: e.target.value })} className={ic()} placeholder="Unlimited, minimum 15 days encouraged" /></F>
            <F label="Remote policy"><textarea value={form.remote_policy} onChange={e => update({ remote_policy: e.target.value })} className={tc()} rows={2} placeholder="Hybrid 2x/week, no hard requirements..." /></F>
            <F label="Learning & development"><textarea value={form.learning_and_development} onChange={e => update({ learning_and_development: e.target.value })} className={tc()} rows={2} placeholder="$2k/yr budget, 2 conferences/yr..." /></F>
            <F label="Other benefits"><textarea value={form.other_benefits} onChange={e => update({ other_benefits: e.target.value })} className={tc()} rows={2} placeholder="Home office stipend, gym, meals..." /></F>
          </>
        )}

        {activeSection === 5 && (
          <>
            <h2 className="text-lg font-semibold text-[#0F172A]">Interview Process</h2>
            <F label="Process overview"><textarea value={form.interview_process_overview} onChange={e => update({ interview_process_overview: e.target.value })} className={tc()} rows={3} placeholder="Recruiter screen → Technical screen → 3-hour virtual onsite → Reference check → Offer" /></F>
            <F label="Typical timeline"><input type="text" value={form.typical_timeline} onChange={e => update({ typical_timeline: e.target.value })} className={ic()} placeholder="2-3 weeks end to end" /></F>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Interview stages</label>
              {form.interview_stages.map((stage, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">Stage {i + 1}</span>
                    {form.interview_stages.length > 1 && (
                      <button type="button" onClick={() => update({ interview_stages: form.interview_stages.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500 text-sm">Remove</button>
                    )}
                  </div>
                  <input type="text" value={stage.stage_name} onChange={e => { const s = [...form.interview_stages]; s[i] = { ...s[i], stage_name: e.target.value }; update({ interview_stages: s }) }} className={ic()} placeholder="Technical Screen" />
                  <input type="text" value={stage.description} onChange={e => { const s = [...form.interview_stages]; s[i] = { ...s[i], description: e.target.value }; update({ interview_stages: s }) }} className={ic()} placeholder="What happens in this stage" />
                  <input type="text" value={stage.what_assessing} onChange={e => { const s = [...form.interview_stages]; s[i] = { ...s[i], what_assessing: e.target.value }; update({ interview_stages: s }) }} className={ic()} placeholder="What you are assessing" />
                  <input type="number" value={stage.duration_minutes} onChange={e => { const s = [...form.interview_stages]; s[i] = { ...s[i], duration_minutes: e.target.value }; update({ interview_stages: s }) }} className={ic()} placeholder="60 (minutes)" />
                </div>
              ))}
              <button type="button" onClick={() => update({ interview_stages: [...form.interview_stages, { stage_name: '', description: '', what_assessing: '', duration_minutes: '' }] })}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg py-3 text-slate-400 hover:border-[#6366F1] hover:text-[#6366F1] text-sm transition-colors">
                + Add stage
              </button>
            </div>
          </>
        )}

        {activeSection === 6 && (
          <>
            <h2 className="text-lg font-semibold text-[#0F172A]">Agent Instructions</h2>
            <p className="text-slate-500 text-sm -mt-3">Tell your buyer agent what to always emphasize and what to be transparent about.</p>
            <F label="Always emphasize to candidates" hint="What gets candidates excited? What should the agent always highlight?"><textarea value={form.always_emphasize} onChange={e => update({ always_emphasize: e.target.value })} className={tc()} rows={3} placeholder="The direct impact on 10M users, the technical depth of the infra team..." /></F>
            <F label="Be honest about" hint="What should the agent be upfront about even if not a selling point?"><textarea value={form.never_misrepresent} onChange={e => update({ never_misrepresent: e.target.value })} className={tc()} rows={3} placeholder="Oncall is real and frequent, no PIP process before termination..." /></F>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setActiveSection(s => Math.max(0, s - 1))} disabled={activeSection === 0}
          className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-40 transition-colors">
          Previous
        </button>
        {activeSection < SECTIONS.length - 1 ? (
          <button onClick={() => setActiveSection(s => s + 1)}
            className="px-6 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors">
            Next Section
          </button>
        ) : (
          <button onClick={() => { router.push('/dashboard/companies'); toast.success('Company profile saved!') }}
            className="px-6 py-2.5 bg-[#10B981] text-white rounded-lg text-sm font-medium hover:bg-[#0d9e6e] transition-colors">
            Done
          </button>
        )}
      </div>
    </div>
  )
}

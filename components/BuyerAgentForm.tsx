'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface AgentFormData {
  role_title: string
  company_name: string
  job_description: string
  why_last_candidates_failed: string
  what_hiring_manager_actually_cares_about: string
  team_dynamics: string
  hidden_dealbreakers: string
  actual_remote_flexibility: string
  comp_band_min: string
  comp_band_max: string
}

const empty: AgentFormData = {
  role_title: '',
  company_name: '',
  job_description: '',
  why_last_candidates_failed: '',
  what_hiring_manager_actually_cares_about: '',
  team_dynamics: '',
  hidden_dealbreakers: '',
  actual_remote_flexibility: '',
  comp_band_min: '',
  comp_band_max: '',
}

function inputClass() {
  return 'w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm'
}

function textareaClass() {
  return 'w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm resize-none'
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

export default function BuyerAgentForm({ initialData, agentId }: { initialData?: Partial<AgentFormData>; agentId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<AgentFormData>({ ...empty, ...initialData })
  const [loading, setLoading] = useState(false)

  const update = (field: keyof AgentFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.role_title || !form.company_name || !form.job_description) {
      toast.error('Role title, company name, and job description are required.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      ...form,
      comp_band_min: form.comp_band_min ? parseInt(form.comp_band_min) : null,
      comp_band_max: form.comp_band_max ? parseInt(form.comp_band_max) : null,
      recruiter_id: user!.id,
    }

    let error
    if (agentId) {
      const res = await supabase.from('buyer_agents').update(payload).eq('id', agentId)
      error = res.error
    } else {
      const res = await supabase.from('buyer_agents').insert(payload).select().single()
      error = res.error
      if (!error && res.data) {
        toast.success('Buyer agent created!')
        router.push(`/dashboard/agents/${res.data.id}`)
        return
      }
    }

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Saved!')
      router.push('/dashboard/agents')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        <h2 className="font-semibold text-[#0F172A]">Role Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role title *">
            <input
              type="text"
              required
              value={form.role_title}
              onChange={e => update('role_title', e.target.value)}
              className={inputClass()}
              placeholder="Staff Software Engineer"
            />
          </Field>
          <Field label="Company name *">
            <input
              type="text"
              required
              value={form.company_name}
              onChange={e => update('company_name', e.target.value)}
              className={inputClass()}
              placeholder="Acme Corp"
            />
          </Field>
        </div>
        <Field label="Job description *" hint="Paste the full JD or write your own">
          <textarea
            required
            value={form.job_description}
            onChange={e => update('job_description', e.target.value)}
            className={textareaClass()}
            rows={8}
            placeholder="We are looking for..."
          />
        </Field>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        <h2 className="font-semibold text-[#0F172A]">Hidden Context</h2>
        <p className="text-slate-500 text-sm -mt-3">
          This is not shown to candidates. Be brutally honest — it helps Claude assess fit accurately.
        </p>
        <Field
          label="Why did the last candidates fail?"
          hint="Be specific about the actual reasons, not the official story"
        >
          <textarea
            value={form.why_last_candidates_failed}
            onChange={e => update('why_last_candidates_failed', e.target.value)}
            className={textareaClass()}
            rows={3}
            placeholder="Last 3 candidates couldn't handle the ambiguity / the HM couldn't work with someone who needed too much direction..."
          />
        </Field>
        <Field
          label="What does the hiring manager actually care about?"
          hint="Beyond the job description"
        >
          <textarea
            value={form.what_hiring_manager_actually_cares_about}
            onChange={e => update('what_hiring_manager_actually_cares_about', e.target.value)}
            className={textareaClass()}
            rows={3}
            placeholder="They want someone who can lead the infra rewrite without hand-holding. Strong opinions on reliability."
          />
        </Field>
        <Field label="Team dynamics">
          <textarea
            value={form.team_dynamics}
            onChange={e => update('team_dynamics', e.target.value)}
            className={textareaClass()}
            rows={3}
            placeholder="Fast-moving team of 4, two strong seniors who clash, need a calm leader..."
          />
        </Field>
        <Field label="Hidden dealbreakers">
          <textarea
            value={form.hidden_dealbreakers}
            onChange={e => update('hidden_dealbreakers', e.target.value)}
            className={textareaClass()}
            rows={2}
            placeholder="Won't work with anyone who has been a solo developer for 5+ years. Must have startup experience."
          />
        </Field>
        <Field
          label="Actual remote flexibility"
          hint="What is really required vs. what the JD says"
        >
          <textarea
            value={form.actual_remote_flexibility}
            onChange={e => update('actual_remote_flexibility', e.target.value)}
            className={textareaClass()}
            rows={2}
            placeholder="JD says hybrid 2x/week but HM really wants 4x/week in office..."
          />
        </Field>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-[#0F172A] mb-5">Compensation</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min ($/yr)">
            <input
              type="number"
              value={form.comp_band_min}
              onChange={e => update('comp_band_min', e.target.value)}
              className={inputClass()}
              placeholder="180000"
            />
          </Field>
          <Field label="Max ($/yr)">
            <input
              type="number"
              value={form.comp_band_max}
              onChange={e => update('comp_band_max', e.target.value)}
              className={inputClass()}
              placeholder="250000"
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : agentId ? 'Update Agent' : 'Create Agent'}
        </button>
      </div>
    </form>
  )
}

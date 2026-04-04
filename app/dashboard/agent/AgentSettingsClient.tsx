'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Settings {
  auto_match_enabled: boolean
  auto_outreach_enabled: boolean
  notification_threshold: number
  target_companies: string[]
  excluded_companies: string[]
  outreach_tone: 'professional' | 'casual' | 'technical'
  custom_outreach_context: string
}

const defaults: Settings = {
  auto_match_enabled: true,
  auto_outreach_enabled: false,
  notification_threshold: 75,
  target_companies: [],
  excluded_companies: [],
  outreach_tone: 'professional',
  custom_outreach_context: '',
}

function TagInput({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  const add = () => { const t = input.trim(); if (t && !value.includes(t)) onChange([...value, t]); setInput('') }
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

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-[#6366F1]' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function AgentSettingsClient({ userId, initialSettings }: { userId: string; initialSettings: any }) {
  const [settings, setSettings] = useState<Settings>({
    ...defaults,
    ...(initialSettings || {}),
    target_companies: initialSettings?.target_companies || [],
    excluded_companies: initialSettings?.excluded_companies || [],
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<NodeJS.Timeout | null>(null)

  const save = useCallback(async (s: Settings) => {
    setSaveStatus('saving')
    const supabase = createClient()
    const { error } = await supabase.from('agent_settings').upsert({ user_id: userId, ...s }, { onConflict: 'user_id' })
    if (error) { toast.error('Save failed'); setSaveStatus('idle') }
    else { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) }
  }, [userId])

  const update = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => save(next), 500)
      return next
    })
  }, [save])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {saveStatus !== 'idle' && (
          <span className={`text-xs ${saveStatus === 'saving' ? 'text-slate-400' : 'text-[#10B981]'}`}>
            {saveStatus === 'saving' ? '● Saving...' : '✓ Saved'}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        <h2 className="font-semibold text-[#0F172A]">Matching</h2>
        <Toggle
          checked={settings.auto_match_enabled}
          onChange={v => update({ auto_match_enabled: v })}
          label="Auto-match enabled"
          description="Your agent continuously scans job postings and runs assessments"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notification threshold: <span className="text-[#6366F1]">{settings.notification_threshold}%</span>
          </label>
          <p className="text-xs text-slate-400 mb-2">Only notify me for matches above this score</p>
          <input
            type="range" min={50} max={95} value={settings.notification_threshold}
            onChange={e => update({ notification_threshold: parseInt(e.target.value) })}
            className="w-full accent-[#6366F1]"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>50% (more matches)</span>
            <span>95% (fewer, higher quality)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        <h2 className="font-semibold text-[#0F172A]">Target Companies</h2>
        <TagInput label="Prioritize these companies" value={settings.target_companies} onChange={v => update({ target_companies: v })} placeholder="Stripe, Linear, Vercel..." />
        <TagInput label="Exclude these companies" value={settings.excluded_companies} onChange={v => update({ excluded_companies: v })} placeholder="Companies to never match..." />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
        <h2 className="font-semibold text-[#0F172A]">Autonomous Outreach</h2>

        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
          Auto-outreach is off by default. You approve every email before it sends unless you explicitly enable autonomous mode.
          You can pause your agent at any time.
        </div>

        <Toggle
          checked={settings.auto_outreach_enabled}
          onChange={v => {
            if (v) {
              if (!confirm('Enable autonomous outreach? Your agent will send introduction emails on your behalf when fit score exceeds your notification threshold. You can review sent emails.')) return
            }
            update({ auto_outreach_enabled: v })
          }}
          label="Auto-outreach enabled"
          description="Agent sends emails automatically without your approval"
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Outreach tone</label>
          <div className="flex gap-3">
            {(['professional', 'casual', 'technical'] as const).map(tone => (
              <button key={tone} type="button" onClick={() => update({ outreach_tone: tone })}
                className={`flex-1 py-2 rounded-lg text-sm border capitalize transition-colors ${settings.outreach_tone === tone ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]' : 'border-slate-200 text-slate-600'}`}>
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom context for outreach</label>
          <textarea
            value={settings.custom_outreach_context}
            onChange={e => update({ custom_outreach_context: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-sm resize-none"
            placeholder="Add anything you want your agent to mention when introducing you..."
          />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface AtsConnection {
  id: string
  ats_type: string
  is_active: boolean
  verification_status: string | null
  can_write_candidates: boolean
}

interface ConnectModal {
  atsType: 'greenhouse' | 'lever'
  apiKey: string
  boardToken: string
  subdomain: string
}

function GreenhouseModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<ConnectModal>) => Promise<void> }) {
  const [apiKey, setApiKey] = useState('')
  const [boardToken, setBoardToken] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    await onSave({ apiKey, boardToken })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Connect Greenhouse</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Harvest API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              placeholder="Your Greenhouse Harvest API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Board Token (optional)</label>
            <input
              type="text"
              value={boardToken}
              onChange={e => setBoardToken(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              placeholder="Your job board token"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:border-slate-300 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!apiKey.trim() || saving} className="flex-1 bg-[#6366F1] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-50 transition-colors">
            {saving ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LeverModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<ConnectModal>) => Promise<void> }) {
  const [apiKey, setApiKey] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    await onSave({ apiKey, subdomain })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Connect Lever</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              placeholder="Your Lever API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Subdomain (optional)</label>
            <input
              type="text"
              value={subdomain}
              onChange={e => setSubdomain(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
              placeholder="yourcompany"
            />
            <p className="text-xs text-slate-400 mt-1">The part before .lever.co</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:border-slate-300 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!apiKey.trim() || saving} className="flex-1 bg-[#6366F1] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-50 transition-colors">
            {saving ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OtherAtsModal({ onClose }: { onClose: () => void }) {
  const [atsName, setAtsName] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Request Integration</h2>
        {submitted ? (
          <div className="text-center py-4">
            <p className="text-[#10B981] font-medium mb-2">Request submitted!</p>
            <p className="text-slate-500 text-sm">We will reach out when your ATS integration is ready.</p>
            <button onClick={onClose} className="mt-4 bg-[#6366F1] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors">Done</button>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Which ATS do you use?</label>
              <input
                type="text"
                value={atsName}
                onChange={e => setAtsName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                placeholder="Ashby, Workday, SmartRecruiters..."
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:border-slate-300 transition-colors">Cancel</button>
              <button onClick={() => setSubmitted(true)} disabled={!atsName.trim()} className="flex-1 bg-[#6366F1] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-50 transition-colors">
                Submit request
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<AtsConnection[]>([])
  const [modal, setModal] = useState<'greenhouse' | 'lever' | 'other' | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('ats_connections').select('*').then(({ data }) => {
      if (data) setConnections(data)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getConnection = (type: string) => connections.find(c => c.ats_type === type)

  const saveConnection = async (atsType: 'greenhouse' | 'lever', data: Partial<ConnectModal>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload: Record<string, unknown> = {
      recruiter_id: user.id,
      ats_type: atsType,
      api_key: data.apiKey,
      is_active: true,
      verification_status: 'pending',
      can_write_candidates: true
    }
    if (atsType === 'greenhouse') payload.board_token = data.boardToken || null
    if (atsType === 'lever') payload.subdomain = data.subdomain || null

    const { data: result, error } = await supabase
      .from('ats_connections')
      .upsert(payload, { onConflict: 'recruiter_id,ats_type' })
      .select()
      .single()

    if (error) {
      toast.error('Failed to save connection')
    } else {
      setConnections(prev => {
        const existing = prev.findIndex(c => c.ats_type === atsType)
        if (existing >= 0) return prev.map((c, i) => i === existing ? result : c)
        return [...prev, result]
      })
      toast.success(`${atsType === 'greenhouse' ? 'Greenhouse' : 'Lever'} connected`)
      setModal(null)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Integrations</h1>
        <p className="text-slate-500 mt-1">Connect your ATS to push revealed candidates automatically.</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">ATS Connections</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Greenhouse */}
          {(() => {
            const conn = getConnection('greenhouse')
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#24A356]/10 flex items-center justify-center text-lg">🌿</div>
                  <div>
                    <p className="font-semibold text-[#0F172A]">Greenhouse</p>
                    <p className="text-xs text-slate-400">Harvest API v1</p>
                  </div>
                </div>
                {conn?.is_active ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                      <span className="text-xs text-[#10B981] font-medium">Connected</span>
                    </div>
                    <p className="text-xs text-slate-500">Revealed candidates will be automatically added to Greenhouse.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setModal('greenhouse')}
                    className="w-full border border-[#6366F1] text-[#6366F1] py-2 rounded-lg text-sm font-medium hover:bg-[#6366F1]/5 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            )
          })()}

          {/* Lever */}
          {(() => {
            const conn = getConnection('lever')
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1A1A]/5 flex items-center justify-center text-lg">⚡</div>
                  <div>
                    <p className="font-semibold text-[#0F172A]">Lever</p>
                    <p className="text-xs text-slate-400">Lever API v1</p>
                  </div>
                </div>
                {conn?.is_active ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                      <span className="text-xs text-[#10B981] font-medium">Connected</span>
                    </div>
                    <p className="text-xs text-slate-500">Revealed candidates will be automatically added to Lever.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setModal('lever')}
                    className="w-full border border-[#6366F1] text-[#6366F1] py-2 rounded-lg text-sm font-medium hover:bg-[#6366F1]/5 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            )
          })()}

          {/* Other */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg">🔌</div>
              <div>
                <p className="font-semibold text-[#0F172A]">Other ATS</p>
                <p className="text-xs text-slate-400">Ashby, Workday, etc.</p>
              </div>
            </div>
            <button
              onClick={() => setModal('other')}
              className="w-full border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:border-slate-300 transition-colors"
            >
              Request integration
            </button>
          </div>
        </div>
      </div>

      {/* Bookmarklet section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#0F172A] mb-1">Browser Bookmarklet</h2>
            <p className="text-slate-500 text-sm">Import any job posting instantly from any tab.</p>
          </div>
          <Link
            href="/dashboard/integrations/bookmarklet"
            className="bg-[#6366F1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
          >
            Get bookmarklet →
          </Link>
        </div>
      </div>

      {modal === 'greenhouse' && (
        <GreenhouseModal
          onClose={() => setModal(null)}
          onSave={data => saveConnection('greenhouse', data)}
        />
      )}
      {modal === 'lever' && (
        <LeverModal
          onClose={() => setModal(null)}
          onSave={data => saveConnection('lever', data)}
        />
      )}
      {modal === 'other' && <OtherAtsModal onClose={() => setModal(null)} />}
    </div>
  )
}

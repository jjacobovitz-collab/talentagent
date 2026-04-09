'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CompanyProfileForm from '@/components/CompanyProfileForm'
import toast from 'react-hot-toast'

export default function NewCompanyClient({ recruiterId }: { recruiterId: string }) {
  const [path, setPath] = useState<'choose' | 'manual' | 'documents'>('choose')
  const [companyName, setCompanyName] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const createAndRedirect = async () => {
    if (!companyName.trim()) return
    setCreating(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('company_profiles')
      .insert({ recruiter_id: recruiterId, company_name: companyName.trim() })
      .select()
      .single()
    if (error || !data) {
      toast.error('Failed to create company profile')
      setCreating(false)
      return
    }
    router.push(`/dashboard/companies/${data.id}?tab=documents`)
  }

  if (path === 'choose') {
    return (
      <div className="space-y-4">
        {/* Path A: Documents */}
        <button
          onClick={() => setPath('documents')}
          className="w-full text-left bg-[#6366F1]/5 border-2 border-[#6366F1]/30 hover:border-[#6366F1] rounded-xl p-6 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center text-2xl shrink-0 group-hover:bg-[#6366F1]/20 transition-colors">
              📄
            </div>
            <div>
              <p className="font-semibold text-[#0F172A] text-lg mb-1">Start with Documents</p>
              <p className="text-slate-500 text-sm">Upload your culture deck, engineering handbook, or any company documents. We extract everything automatically.</p>
              <p className="text-[#6366F1] text-sm font-medium mt-2">Upload Documents →</p>
            </div>
          </div>
        </button>

        {/* Path B: Manual */}
        <button
          onClick={() => setPath('manual')}
          className="w-full text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
              ✏️
            </div>
            <div>
              <p className="font-semibold text-[#0F172A]">Fill Out Manually</p>
              <p className="text-slate-400 text-sm">Prefer to fill out the form yourself? Start with a blank form →</p>
            </div>
          </div>
        </button>
      </div>
    )
  }

  if (path === 'documents') {
    return (
      <div className="space-y-4">
        <button onClick={() => setPath('choose')} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-[#0F172A] mb-1">First, name the company</h2>
          <p className="text-slate-500 text-sm mb-4">We will create the profile and then take you straight to document upload.</p>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createAndRedirect() }}
            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 mb-4"
            placeholder="Acme Corp"
            autoFocus
          />
          <button
            onClick={createAndRedirect}
            disabled={!companyName.trim() || creating}
            className="w-full bg-[#6366F1] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5558e8] disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating...' : 'Create and upload documents →'}
          </button>
        </div>
      </div>
    )
  }

  // Manual path
  return (
    <div className="space-y-4">
      <button onClick={() => setPath('choose')} className="text-slate-400 hover:text-slate-600 text-sm">← Back</button>
      <CompanyProfileForm recruiterId={recruiterId} />
    </div>
  )
}

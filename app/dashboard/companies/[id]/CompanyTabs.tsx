'use client'

import { useState } from 'react'
import CompanyProfileForm from '@/components/CompanyProfileForm'
import DocumentsTab from './DocumentsTab'

interface Props {
  recruiterId: string
  initialData: Record<string, unknown>
  companyId: string
}

export default function CompanyTabs({ recruiterId, initialData, companyId }: Props) {
  const [tab, setTab] = useState<'manual' | 'documents'>('manual')

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'manual' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Manual
        </button>
        <button
          onClick={() => setTab('documents')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'documents' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-slate-500 hover:text-slate-700'}`}
        >
          From Documents
        </button>
      </div>

      {tab === 'manual' && (
        <CompanyProfileForm recruiterId={recruiterId} initialData={initialData} companyId={companyId} />
      )}

      {tab === 'documents' && (
        <DocumentsTab companyProfileId={companyId} />
      )}
    </div>
  )
}

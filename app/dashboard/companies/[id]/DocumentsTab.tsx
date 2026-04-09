'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { detectDocumentType, calculateCompanyProfileCompleteness, DOCUMENT_TYPE_LABELS } from '@/lib/utils/company'

interface Document {
  id: string
  document_name: string
  document_type: string
  file_type: string
  extraction_status: 'pending' | 'extracting' | 'complete' | 'failed'
  extracted_at: string | null
  extracted_data: Record<string, unknown>
  created_at: string
}

interface Draft {
  id: string
  draft_data: Record<string, unknown>
  field_sources: Record<string, { document_name: string; document_id: string; confidence: string; excerpt: string }>
  missing_fields: string[]
  low_confidence_fields: string[]
  suggested_questions: Array<{ field: string; question: string; why: string }>
  documents_used: number
  review_status: string
}

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-500',
  extracting: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  complete: 'bg-[#10B981]/10 text-[#10B981]',
  failed: 'bg-[#EF4444]/10 text-[#EF4444]',
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-[#10B981]',
  medium: 'bg-[#F59E0B]',
  low: 'bg-[#EF4444]',
}

const DRAFT_FIELDS = [
  { key: 'engineering_values', label: 'Engineering Values', multiline: true },
  { key: 'engineering_culture', label: 'Engineering Culture', multiline: true },
  { key: 'remote_policy', label: 'Remote Policy', multiline: false },
  { key: 'base_comp_philosophy', label: 'Comp Philosophy', multiline: true },
  { key: 'equity_structure', label: 'Equity Structure', multiline: false },
  { key: 'health_benefits', label: 'Health Benefits', multiline: false },
  { key: 'pto_policy', label: 'PTO Policy', multiline: false },
  { key: 'learning_and_development', label: 'Learning & Development', multiline: false },
  { key: 'oncall_expectations', label: 'On-Call Expectations', multiline: true },
  { key: 'code_review_culture', label: 'Code Review Culture', multiline: true },
  { key: 'deployment_frequency', label: 'Deployment Frequency', multiline: false },
  { key: 'architecture_philosophy', label: 'Architecture Philosophy', multiline: true },
  { key: 'traits_of_successful_engineers', label: 'Traits of Successful Engineers', multiline: true },
  { key: 'traits_that_struggle_here', label: 'Traits That Struggle Here', multiline: true },
  { key: 'why_engineers_join', label: 'Why Engineers Join', multiline: true },
  { key: 'why_engineers_leave', label: 'Why Engineers Leave', multiline: true },
  { key: 'interview_process_overview', label: 'Interview Process', multiline: true },
  { key: 'typical_timeline', label: 'Typical Interview Timeline', multiline: false },
  { key: 'company_stage', label: 'Company Stage', multiline: false },
  { key: 'company_size', label: 'Company Size', multiline: false },
  { key: 'industry', label: 'Industry', multiline: false },
  { key: 'headquarters', label: 'Headquarters', multiline: false },
  { key: 'always_emphasize', label: 'Always Emphasize', multiline: true },
  { key: 'never_misrepresent', label: 'Never Misrepresent', multiline: true },
]

const ARRAY_FIELDS = ['core_languages', 'core_frameworks', 'core_infrastructure', 'core_tools']

function fieldsFoundCount(extracted: Record<string, unknown>): number {
  const confidence = extracted.confidence as Record<string, string> | null
  if (!confidence) return 0
  return Object.values(confidence).filter(v => v !== 'not_found').length
}

export default function DocumentsTab({ companyProfileId }: { companyProfileId: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlType, setUrlType] = useState('careers_page')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [editedDraft, setEditedDraft] = useState<Record<string, unknown>>({})
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({})
  const [applying, setApplying] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; docType: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/company/documents?companyProfileId=${companyProfileId}`)
    const data = await res.json()
    setDocuments(data.documents || [])
    if (data.draft) {
      setDraft(data.draft)
      setEditedDraft(data.draft.draft_data || {})
    }
  }, [companyProfileId])

  useEffect(() => { loadData() }, [loadData])

  // Poll while any document is extracting
  useEffect(() => {
    const hasExtracting = documents.some(d => d.extraction_status === 'extracting' || d.extraction_status === 'pending')
    if (!hasExtracting) return
    const timer = setInterval(loadData, 3000)
    return () => clearInterval(timer)
  }, [documents, loadData])

  const addFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['pdf', 'pptx', 'txt', 'md'].includes(ext || '')
    })
    const newPending = accepted.map(file => ({
      file,
      docType: detectDocumentType(file.name, '')
    }))
    setPendingFiles(prev => [...prev, ...newPending])
  }

  const uploadPending = async () => {
    if (pendingFiles.length === 0) return
    setUploading(true)
    for (const { file, docType } of pendingFiles) {
      const fd = new FormData()
      fd.append('companyProfileId', companyProfileId)
      fd.append('documentType', docType)
      fd.append('file', file)
      try {
        const res = await fetch('/api/company/ingest-document', { method: 'POST', body: fd })
        const data = await res.json()
        if (!data.success) toast.error(`Failed: ${file.name}`)
      } catch {
        toast.error(`Failed: ${file.name}`)
      }
    }
    setPendingFiles([])
    setUploading(false)
    await loadData()
    toast.success('Documents uploaded and analyzed')
  }

  const fetchUrl = async () => {
    if (!urlInput.trim()) return
    setFetchingUrl(true)
    const fd = new FormData()
    fd.append('companyProfileId', companyProfileId)
    fd.append('documentType', urlType)
    fd.append('url', urlInput.trim())
    try {
      const res = await fetch('/api/company/ingest-document', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        toast.success('URL fetched and analyzed')
        setUrlInput('')
        await loadData()
      } else {
        toast.error(data.error || 'Failed to fetch URL')
      }
    } catch {
      toast.error('Failed to fetch URL')
    }
    setFetchingUrl(false)
  }

  const handleApply = async () => {
    setApplying(true)
    // Merge question answers into draft
    const finalData = { ...editedDraft }
    for (const q of draft?.suggested_questions || []) {
      if (questionAnswers[q.field] && questionAnswers[q.field].trim()) {
        finalData[q.field] = questionAnswers[q.field]
      }
    }
    try {
      const res = await fetch('/api/company/apply-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyProfileId, approvedData: finalData })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Profile updated from documents')
        await loadData()
      } else {
        toast.error('Failed to apply draft')
      }
    } catch {
      toast.error('Failed to apply draft')
    }
    setApplying(false)
  }

  const completeness = draft ? calculateCompanyProfileCompleteness(editedDraft) : 0

  return (
    <div className="space-y-8">
      {/* Section 1: Upload */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-[#0F172A] mb-1">Upload Documents</h2>
        <p className="text-slate-500 text-sm mb-4">Upload your culture deck, engineering handbook, careers page, or any company documents. We extract everything automatically.</p>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors cursor-pointer ${dragOver ? 'border-[#6366F1] bg-[#6366F1]/5' : 'border-slate-200 hover:border-slate-300'}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
        >
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">PDF, PPTX, TXT, MD up to 10 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.pptx,.txt,.md"
            className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
          />
        </div>

        {/* Pending files */}
        {pendingFiles.length > 0 && (
          <div className="space-y-2 mb-4">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <span className="text-lg">📄</span>
                <span className="flex-1 text-sm text-slate-700 truncate">{pf.file.name}</span>
                <select
                  value={pf.docType}
                  onChange={e => setPendingFiles(prev => prev.map((p, j) => j === i ? { ...p, docType: e.target.value } : p))}
                  className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-[#EF4444] text-xs">✕</button>
              </div>
            ))}
            <button
              onClick={uploadPending}
              disabled={uploading}
              className="w-full bg-[#6366F1] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#5558e8] disabled:opacity-60 transition-colors"
            >
              {uploading ? 'Analyzing...' : `Analyze ${pendingFiles.length} document${pendingFiles.length > 1 ? 's' : ''} →`}
            </button>
          </div>
        )}

        {/* URL input */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Or fetch from URL</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://company.com/engineering/culture"
              className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
            />
            <select
              value={urlType}
              onChange={e => setUrlType(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <button
              onClick={fetchUrl}
              disabled={fetchingUrl || !urlInput.trim()}
              className="bg-[#6366F1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {fetchingUrl ? '...' : 'Fetch'}
            </button>
          </div>
        </div>
      </div>

      {/* Document cards */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Processed Documents</h2>
          {documents.map(doc => {
            const found = fieldsFoundCount(doc.extracted_data)
            const isExpanded = expandedDoc === doc.id
            const confidence = doc.extracted_data?.confidence as Record<string, string> | null
            return (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <span className="text-2xl shrink-0">{doc.file_type === 'pdf' ? '📕' : doc.file_type === 'url' ? '🌐' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.document_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                      {doc.extraction_status === 'complete' && (
                        <span className="text-xs text-[#10B981]">· {found} field{found !== 1 ? 's' : ''} found</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.extraction_status]}`}>
                    {doc.extraction_status === 'extracting' ? 'Analyzing...' : doc.extraction_status}
                  </span>
                  {doc.extraction_status === 'complete' && (
                    <button
                      onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors ml-1"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                {isExpanded && confidence && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(confidence).map(([field, conf]) => conf !== 'not_found' && (
                        <span key={field} className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                          <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[conf] || 'bg-slate-300'}`} />
                          {field.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    {(doc.extracted_data.fields_not_found as string[] | null)?.length ? (
                      <p className="text-xs text-slate-400 mt-3">
                        Not found: {(doc.extracted_data.fields_not_found as string[]).join(', ')}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Section 2: Synthesized draft */}
      {draft && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#0F172A]">Synthesized Draft</h2>
              <p className="text-slate-500 text-xs mt-0.5">From {draft.documents_used} document{draft.documents_used !== 1 ? 's' : ''}. Edit any field before applying.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#6366F1]">{completeness}%</p>
              <p className="text-xs text-slate-400">completeness</p>
            </div>
          </div>

          {/* Completeness bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6">
            <div
              className={`h-1.5 rounded-full transition-all ${completeness >= 70 ? 'bg-[#10B981]' : completeness >= 40 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
              style={{ width: `${completeness}%` }}
            />
          </div>

          {/* Array fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {ARRAY_FIELDS.map(key => {
              const label = key.replace('core_', '').replace(/_/g, ' ')
              const val = (editedDraft[key] as string[] | null) || []
              return (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{label}</label>
                  <input
                    value={val.join(', ')}
                    onChange={e => setEditedDraft(prev => ({
                      ...prev,
                      [key]: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                    placeholder="Comma-separated"
                  />
                </div>
              )
            })}
          </div>

          {/* Text fields */}
          <div className="space-y-4">
            {DRAFT_FIELDS.map(({ key, label, multiline }) => {
              const source = draft.field_sources?.[key]
              const isMissing = draft.missing_fields?.includes(key)
              const isLowConf = draft.low_confidence_fields?.includes(key)
              const val = (editedDraft[key] as string | null) || ''

              return (
                <div key={key} className={`rounded-lg p-3 ${isMissing ? 'bg-[#EF4444]/5 border border-[#EF4444]/20' : isLowConf ? 'bg-[#F59E0B]/5 border border-[#F59E0B]/20' : 'bg-slate-50 border border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600">{label}</label>
                    <div className="flex items-center gap-2">
                      {source && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          source.confidence === 'high' ? 'bg-[#10B981]/10 text-[#10B981]' :
                          source.confidence === 'medium' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                          'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}>
                          {source.document_name.length > 20 ? source.document_name.substring(0, 20) + '…' : source.document_name}
                        </span>
                      )}
                      {isMissing && <span className="text-[10px] text-[#EF4444] font-medium">Not found</span>}
                      {isLowConf && !isMissing && <span className="text-[10px] text-[#F59E0B] font-medium">Low confidence — verify</span>}
                    </div>
                  </div>
                  {multiline ? (
                    <textarea
                      value={val}
                      onChange={e => setEditedDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={3}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 resize-none"
                      placeholder={isMissing ? 'Not found in documents — fill in manually' : ''}
                    />
                  ) : (
                    <input
                      value={val}
                      onChange={e => setEditedDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30"
                      placeholder={isMissing ? 'Not found in documents — fill in manually' : ''}
                    />
                  )}
                  {source?.excerpt && (
                    <p className="text-[10px] text-slate-400 mt-1 italic truncate">&ldquo;{source.excerpt}&rdquo;</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Section 3: Questions to fill gaps */}
      {draft && draft.suggested_questions?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-[#0F172A] mb-1">Questions to Fill Gaps</h2>
          <p className="text-slate-500 text-sm mb-4">These fields were not found in any document. Answering them improves match quality.</p>
          <div className="space-y-4">
            {draft.suggested_questions.map((q, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm font-semibold text-[#0F172A] mb-0.5">{q.question}</p>
                <p className="text-xs text-slate-400 italic mb-3">{q.why}</p>
                <textarea
                  value={questionAnswers[q.field] || ''}
                  onChange={e => setQuestionAnswers(prev => ({ ...prev, [q.field]: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 resize-none"
                  placeholder="Your answer..."
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply button */}
      {draft && (
        <div className="flex justify-end">
          <button
            onClick={handleApply}
            disabled={applying}
            className="bg-[#6366F1] text-white px-8 py-3 rounded-lg text-sm font-semibold hover:bg-[#5558e8] disabled:opacity-60 transition-colors"
          >
            {applying ? 'Applying...' : draft.review_status === 'applied' ? 'Re-apply to Company Profile' : 'Apply to Company Profile →'}
          </button>
        </div>
      )}
    </div>
  )
}

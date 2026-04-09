import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const companyProfileId = formData.get('companyProfileId') as string
  const documentType = formData.get('documentType') as string
  const file = formData.get('file') as File | null
  const url = formData.get('url') as string | null

  if (!companyProfileId) {
    return NextResponse.json({ error: 'Company profile ID required' }, { status: 400 })
  }

  let extractedText = ''
  let documentName = ''
  let fileType = ''
  let fileUrl = ''

  if (url) {
    documentName = url
    fileType = 'url'
    try {
      const fetchResponse = await fetch(url)
      const html = await fetchResponse.text()
      extractedText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000)
    } catch {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 })
    }
  }

  if (file) {
    documentName = file.name
    fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown'

    const fileBytes = await file.arrayBuffer()
    const filePath = `${user.id}/${companyProfileId}/${Date.now()}-${file.name}`

    const { data: uploadData } = await supabase.storage
      .from('company-documents')
      .upload(filePath, file, { upsert: false })

    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from('company-documents')
        .getPublicUrl(filePath)
      fileUrl = urlData.publicUrl
    }

    if (fileType === 'pdf') {
      const base64 = Buffer.from(fileBytes).toString('base64')
      const extractionResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            },
            {
              type: 'text',
              text: 'Extract all text from this document. Preserve the structure and headings. Include all content including small print, footnotes, and captions. Return only the extracted text with no commentary.'
            }
          ]
        }]
      })
      extractedText = extractionResult.content[0].type === 'text' ? extractionResult.content[0].text : ''
    } else if (fileType === 'pptx') {
      const base64 = Buffer.from(fileBytes).toString('base64')
      const extractionResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' as 'application/pdf',
                data: base64
              }
            },
            {
              type: 'text',
              text: 'Extract all text from every slide in this presentation. For each slide include the slide title and all text content. Include speaker notes if present. Return only the extracted text organized by slide.'
            }
          ]
        }]
      })
      extractedText = extractionResult.content[0].type === 'text' ? extractionResult.content[0].text : ''
    } else if (['txt', 'md'].includes(fileType)) {
      extractedText = new TextDecoder().decode(fileBytes).substring(0, 15000)
    }
  }

  if (!extractedText || extractedText.length < 50) {
    return NextResponse.json({ error: 'Could not extract text from document' }, { status: 400 })
  }

  const { data: docRecord } = await supabase
    .from('company_documents')
    .insert({
      company_profile_id: companyProfileId,
      recruiter_id: user.id,
      document_name: documentName,
      document_type: documentType || 'other',
      file_type: fileType,
      file_url: fileUrl || null,
      source_url: url || null,
      file_size_bytes: file?.size || null,
      extracted_text: extractedText,
      extraction_status: 'extracting'
    })
    .select()
    .single()

  const extractionPrompt = `You are analyzing a company document to extract information for a recruiting agent's company profile. Extract every piece of relevant information you can find.

Document type: ${documentType}
Document name: ${documentName}

Document content:
${extractedText.substring(0, 8000)}

Extract all relevant company profile information and return ONLY valid JSON. For any field where you found clear information set confidence to high. For inferred or implied information set confidence to medium. For fields not mentioned set the value to null and confidence to not_found.

{
  "engineering_values": "string or null",
  "engineering_culture": "string or null",
  "tech_stack": {
    "languages": ["string"],
    "frameworks": ["string"],
    "infrastructure": ["string"],
    "tools": ["string"],
    "databases": ["string"]
  },
  "remote_policy": "string or null",
  "comp_philosophy": "string or null",
  "equity_structure": "string or null",
  "health_benefits": "string or null",
  "pto_policy": "string or null",
  "learning_and_development": "string or null",
  "other_benefits": "string or null",
  "oncall_expectations": "string or null",
  "code_review_culture": "string or null",
  "deployment_frequency": "string or null",
  "architecture_philosophy": "string or null",
  "traits_of_successful_engineers": "string or null",
  "traits_that_struggle_here": "string or null",
  "why_engineers_join": "string or null",
  "why_engineers_leave": "string or null",
  "interview_process_overview": "string or null",
  "typical_timeline": "string or null",
  "company_stage": "seed|series_a|series_b|series_c|growth|public|null",
  "company_size": "1-10|11-50|51-200|201-500|501-1000|1000+|null",
  "industry": "string or null",
  "headquarters": "string or null",
  "always_emphasize": "string or null",
  "never_misrepresent": "string or null",
  "confidence": {
    "engineering_values": "high|medium|low|not_found",
    "engineering_culture": "high|medium|low|not_found",
    "tech_stack": "high|medium|low|not_found",
    "remote_policy": "high|medium|low|not_found",
    "comp_philosophy": "high|medium|low|not_found",
    "traits_of_successful_engineers": "high|medium|low|not_found",
    "why_engineers_join": "high|medium|low|not_found",
    "interview_process_overview": "high|medium|low|not_found"
  },
  "key_excerpts": {
    "field_name": "exact quote from document that supports this field"
  },
  "fields_not_found": ["list of important fields with no information in this document"]
}`

  const extractionResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: extractionPrompt }]
  })

  const extractionText = extractionResult.content[0].type === 'text' ? extractionResult.content[0].text : '{}'
  let extractedData: Record<string, unknown> = {}
  try {
    extractedData = JSON.parse(extractionText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim())
  } catch {
    extractedData = {}
  }

  await supabase.from('company_documents').update({
    extracted_data: extractedData,
    extraction_confidence: extractedData.confidence || {},
    extraction_status: 'complete',
    extracted_at: new Date().toISOString()
  }).eq('id', docRecord?.id)

  await updateProfileSynthesis(supabase, user.id, companyProfileId)

  const confidence = (extractedData.confidence || {}) as Record<string, string>
  return NextResponse.json({
    success: true,
    documentId: docRecord?.id,
    extractedData,
    fieldsFound: Object.entries(confidence)
      .filter(([, v]) => v !== 'not_found')
      .map(([k]) => k),
    fieldsNotFound: (extractedData.fields_not_found as string[]) || []
  })
}

async function updateProfileSynthesis(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient>,
  userId: string,
  companyProfileId: string
) {
  const { data: documents } = await supabase
    .from('company_documents')
    .select('*')
    .eq('company_profile_id', companyProfileId)
    .eq('extraction_status', 'complete')

  if (!documents || documents.length === 0) return

  const synthesisPrompt = `You are synthesizing information from ${documents.length} company documents to build a complete company profile for a recruiting agent.

Resolve any conflicts between documents by preferring more specific and recent information. When documents agree on something increase your confidence. When they conflict note it.

DOCUMENTS AND THEIR EXTRACTIONS:
${documents.map((doc, i) => `
Document ${i + 1}: ${doc.document_name} (${doc.document_type})
ID: ${doc.id}
Extracted data: ${JSON.stringify(doc.extracted_data, null, 2)}
`).join('\n')}

Synthesize all documents into a unified company profile. For each field note which document it came from.

Return ONLY valid JSON:
{
  "synthesized_profile": {
    "engineering_values": "string or null",
    "engineering_culture": "string or null",
    "core_languages": ["string"],
    "core_frameworks": ["string"],
    "core_infrastructure": ["string"],
    "core_tools": ["string"],
    "remote_policy": "string or null",
    "base_comp_philosophy": "string or null",
    "equity_structure": "string or null",
    "health_benefits": "string or null",
    "pto_policy": "string or null",
    "learning_and_development": "string or null",
    "other_benefits": "string or null",
    "oncall_expectations": "string or null",
    "code_review_culture": "string or null",
    "deployment_frequency": "string or null",
    "architecture_philosophy": "string or null",
    "traits_of_successful_engineers": "string or null",
    "traits_that_struggle_here": "string or null",
    "why_engineers_join": "string or null",
    "why_engineers_leave": "string or null",
    "interview_process_overview": "string or null",
    "typical_timeline": "string or null",
    "company_stage": "string or null",
    "company_size": "string or null",
    "industry": "string or null",
    "headquarters": "string or null",
    "always_emphasize": "string or null",
    "never_misrepresent": "string or null"
  },
  "field_sources": {
    "field_name": {
      "document_name": "string",
      "document_id": "string",
      "confidence": "high|medium|low",
      "excerpt": "brief quote from the source document"
    }
  },
  "missing_fields": ["fields with no information across all documents"],
  "low_confidence_fields": ["fields found but with low confidence"],
  "suggested_questions": [
    {
      "field": "field name",
      "question": "specific question to ask the recruiter",
      "why": "why this field matters for matching"
    }
  ],
  "profile_completeness_score": 0
}`

  const synthesisResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: synthesisPrompt }]
  })

  const synthesisText = synthesisResult.content[0].type === 'text' ? synthesisResult.content[0].text : '{}'
  let synthesis: Record<string, unknown> = {}
  try {
    synthesis = JSON.parse(synthesisText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim())
  } catch {
    return
  }

  await supabase.from('company_profile_drafts').upsert({
    company_profile_id: companyProfileId,
    recruiter_id: userId,
    draft_data: synthesis.synthesized_profile || {},
    field_sources: synthesis.field_sources || {},
    missing_fields: synthesis.missing_fields || [],
    low_confidence_fields: synthesis.low_confidence_fields || [],
    suggested_questions: synthesis.suggested_questions || [],
    documents_used: documents.length,
    synthesis_completed_at: new Date().toISOString(),
    review_status: 'pending'
  }, { onConflict: 'company_profile_id' })
}

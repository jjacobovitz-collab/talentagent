# Claude Code Build Instructions: Company Profile Document Ingestion

## Overview

Allow recruiters to build a company profile by uploading existing documents instead of filling out a form. Accept PDFs, PowerPoint files, plain text, and URLs. Claude extracts relevant information from each document and synthesizes it into a complete company profile draft. The recruiter reviews and corrects rather than writing from scratch.

This dramatically reduces the time to create a company profile from 30 minutes of form filling to 5 minutes of document upload plus review.

Do not modify any existing working code. Add all new functionality on top of what already exists.

---

## New Database Tables

Run this SQL in Supabase SQL editor:

```sql
-- Document ingestion records
create table public.company_documents (
  id uuid default gen_random_uuid() primary key,
  company_profile_id uuid references public.company_profiles(id) on delete cascade not null,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,

  -- Document metadata
  document_name text not null,
  document_type text not null check (document_type in (
    'culture_deck', 'engineering_handbook', 'careers_page', 
    'job_posting_template', 'onboarding_doc', 'blog_post', 
    'slide_deck', 'url', 'other'
  )),
  file_type text, -- 'pdf', 'pptx', 'txt', 'md', 'url'
  file_url text, -- storage URL for uploaded files
  source_url text, -- original URL if fetched from web
  file_size_bytes integer,
  page_count integer,

  -- Raw extracted text
  extracted_text text,

  -- Claude extraction output
  extraction_status text default 'pending' check (extraction_status in (
    'pending', 'extracting', 'complete', 'failed'
  )),
  extracted_data jsonb default '{}',
  -- {
  --   engineering_values: string,
  --   engineering_culture: string,
  --   tech_stack: {languages: [], frameworks: [], infrastructure: [], tools: []},
  --   remote_policy: string,
  --   comp_philosophy: string,
  --   equity_structure: string,
  --   benefits: string,
  --   pto_policy: string,
  --   oncall_expectations: string,
  --   code_review_culture: string,
  --   deployment_frequency: string,
  --   architecture_philosophy: string,
  --   traits_of_successful_engineers: string,
  --   traits_that_struggle_here: string,
  --   why_engineers_join: string,
  --   why_engineers_leave: string,
  --   interview_process: string,
  --   team_size: string,
  --   company_stage: string,
  --   company_size: string,
  --   fields_not_found: [string]
  -- }
  extraction_confidence jsonb default '{}',
  -- Per field confidence: {field_name: 'high|medium|low|not_found'}

  extracted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Synthesis record (combined output from all documents)
create table public.company_profile_drafts (
  id uuid default gen_random_uuid() primary key,
  company_profile_id uuid references public.company_profiles(id) on delete cascade not null unique,
  recruiter_id uuid references public.profiles(id) on delete cascade not null,

  -- Synthesized draft fields (mirrors company_profiles structure)
  draft_data jsonb default '{}',

  -- Which document contributed to which field
  field_sources jsonb default '{}',
  -- {field_name: {document_id: string, document_name: string, confidence: string, excerpt: string}}

  -- Gaps identified
  missing_fields text[],
  -- Fields we could not find in any document

  -- Low confidence fields
  low_confidence_fields text[],
  -- Fields where we found something but are not sure it is accurate

  -- Suggested questions
  suggested_questions jsonb default '[]',
  -- Questions to ask the recruiter to fill gaps

  -- Review status
  review_status text default 'pending' check (review_status in (
    'pending', 'in_review', 'approved', 'applied'
  )),
  applied_at timestamp with time zone,

  -- Synthesis metadata
  documents_used integer default 0,
  synthesis_completed_at timestamp with time zone,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.company_documents enable row level security;
alter table public.company_profile_drafts enable row level security;

create policy "Recruiters manage own company documents" on public.company_documents
  for all using (auth.uid() = recruiter_id);

create policy "Recruiters manage own profile drafts" on public.company_profile_drafts
  for all using (auth.uid() = recruiter_id);

create trigger handle_company_profile_drafts_updated_at
  before update on public.company_profile_drafts
  for each row execute procedure public.handle_updated_at();
```

---

## Supabase Storage Setup

Run this SQL to create the storage bucket for company documents:

```sql
insert into storage.buckets (id, name, public)
  values ('company-documents', 'company-documents', false);

create policy "Recruiters upload own company documents" on storage.objects
  for insert with check (
    bucket_id = 'company-documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Recruiters read own company documents" on storage.objects
  for select using (
    bucket_id = 'company-documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## New API Routes

### `app/api/company/ingest-document/route.ts`

Accepts a single document upload or URL, extracts text, runs Claude analysis, saves to database.

```typescript
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
  let pageCount = 0

  // Handle URL ingestion
  if (url) {
    documentName = url
    fileType = 'url'

    const fetchResponse = await fetch(url)
    const html = await fetchResponse.text()

    // Strip HTML tags for plain text
    extractedText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000)
  }

  // Handle file upload
  if (file) {
    documentName = file.name
    fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown'

    // Upload to Supabase storage
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

    // Extract text based on file type
    if (fileType === 'pdf') {
      // Send PDF to Claude for text extraction
      const base64 = Buffer.from(fileBytes).toString('base64')

      const extractionResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            },
            {
              type: 'text',
              text: 'Extract all text from this document. Preserve the structure and headings. Include all content including small print, footnotes, and captions. Return only the extracted text with no commentary.'
            }
          ]
        }]
      })

      extractedText = extractionResult.content[0].type === 'text'
        ? extractionResult.content[0].text
        : ''

    } else if (fileType === 'pptx') {
      // Send PPTX as document to Claude
      const base64 = Buffer.from(fileBytes).toString('base64')

      const extractionResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

      extractedText = extractionResult.content[0].type === 'text'
        ? extractionResult.content[0].text
        : ''

    } else if (['txt', 'md'].includes(fileType)) {
      extractedText = new TextDecoder().decode(fileBytes).substring(0, 15000)
    }
  }

  if (!extractedText || extractedText.length < 50) {
    return NextResponse.json({ error: 'Could not extract text from document' }, { status: 400 })
  }

  // Save document record with pending status
  const { data: docRecord } = await supabase
    .from('company_documents')
    .insert({
      company_profile_id: companyProfileId,
      recruiter_id: user.id,
      document_name: documentName,
      document_type: documentType || 'other',
      file_type: fileType,
      file_url: fileUrl,
      source_url: url || null,
      file_size_bytes: file?.size || null,
      extracted_text: extractedText,
      extraction_status: 'extracting'
    })
    .select()
    .single()

  // Run Claude extraction
  const extractionPrompt = `You are analyzing a company document to extract information for a recruiting agent's company profile. Extract every piece of relevant information you can find.

Document type: ${documentType}
Document name: ${documentName}

Document content:
${extractedText.substring(0, 8000)}

Extract all relevant company profile information and return ONLY valid JSON. For any field where you found clear information set confidence to high. For inferred or implied information set confidence to medium. For fields not mentioned set the value to null and confidence to not_found.

{
  "engineering_values": "string or null",
  "engineering_culture": "string or null -- how the team actually operates day to day",
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
  "always_emphasize": "string or null -- things consistently highlighted as positives",
  "never_misrepresent": "string or null -- any honest caveats mentioned",
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
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: extractionPrompt }]
  })

  const extractionText = extractionResult.content[0].type === 'text'
    ? extractionResult.content[0].text
    : '{}'

  let extractedData: any = {}
  try {
    extractedData = JSON.parse(extractionText)
  } catch {
    extractedData = {}
  }

  // Update document record with extraction results
  await supabase.from('company_documents').update({
    extracted_data: extractedData,
    extraction_confidence: extractedData.confidence || {},
    extraction_status: 'complete',
    extracted_at: new Date().toISOString()
  }).eq('id', docRecord?.id)

  // Trigger synthesis update
  await updateProfileSynthesis(supabase, anthropic, user.id, companyProfileId)

  return NextResponse.json({
    success: true,
    documentId: docRecord?.id,
    extractedData,
    fieldsFound: Object.entries(extractedData.confidence || {})
      .filter(([_, v]) => v !== 'not_found')
      .map(([k]) => k),
    fieldsNotFound: extractedData.fields_not_found || []
  })
}

async function updateProfileSynthesis(
  supabase: any,
  anthropic: Anthropic,
  userId: string,
  companyProfileId: string
) {
  // Get all documents for this company profile
  const { data: documents } = await supabase
    .from('company_documents')
    .select('*')
    .eq('company_profile_id', companyProfileId)
    .eq('extraction_status', 'complete')

  if (!documents || documents.length === 0) return

  // Build synthesis prompt
  const synthesisPrompt = `You are synthesizing information from ${documents.length} company documents to build a complete company profile for a recruiting agent.

Resolve any conflicts between documents by preferring more specific and recent information. When documents agree on something increase your confidence. When they conflict note it.

DOCUMENTS AND THEIR EXTRACTIONS:
${documents.map((doc: any, i: number) => `
Document ${i + 1}: ${doc.document_name} (${doc.document_type})
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
  "conflicts_found": ["description of any conflicts between documents"],
  "suggested_questions": [
    {
      "field": "field name",
      "question": "specific question to ask the recruiter",
      "why": "why this field matters for matching"
    }
  ],
  "profile_completeness_score": <integer 0-100>
}`

  const synthesisResult = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: synthesisPrompt }]
  })

  const synthesisText = synthesisResult.content[0].type === 'text'
    ? synthesisResult.content[0].text
    : '{}'

  let synthesis: any = {}
  try {
    synthesis = JSON.parse(synthesisText)
  } catch {
    return
  }

  // Save or update the draft
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
```

### `app/api/company/apply-draft/route.ts`

Applies the reviewed draft to the actual company profile:

```typescript
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyProfileId, approvedData } = await request.json()

  // Update the company profile with approved data
  const { data: updated } = await supabase
    .from('company_profiles')
    .update({
      ...approvedData,
      updated_at: new Date().toISOString()
    })
    .eq('id', companyProfileId)
    .eq('recruiter_id', user.id)
    .select()
    .single()

  // Mark draft as applied
  await supabase.from('company_profile_drafts').update({
    review_status: 'applied',
    applied_at: new Date().toISOString()
  }).eq('company_profile_id', companyProfileId)

  return NextResponse.json({ success: true, profile: updated })
}
```

### `app/api/company/documents/route.ts`

Returns all documents for a company profile:

```typescript
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const companyProfileId = searchParams.get('companyProfileId')

  const { data: documents } = await supabase
    .from('company_documents')
    .select('id, document_name, document_type, file_type, extraction_status, extracted_at, created_at')
    .eq('company_profile_id', companyProfileId)
    .eq('recruiter_id', user.id)
    .order('created_at', { ascending: false })

  const { data: draft } = await supabase
    .from('company_profile_drafts')
    .select('*')
    .eq('company_profile_id', companyProfileId)
    .eq('recruiter_id', user.id)
    .single()

  return NextResponse.json({ documents, draft })
}
```

---

## New Pages to Build

### Updated Company Profile Page (`app/dashboard/companies/[id]/page.tsx`)

Add a new "Build from Documents" tab at the top of the existing company profile page alongside the manual form.

Two tabs:
- **Manual** -- existing form (keep exactly as is)
- **From Documents** -- new document ingestion interface

The From Documents tab has three sections:

**Section 1: Upload Documents**

Upload zone with drag and drop. Accept: `.pdf`, `.pptx`, `.txt`, `.md`

Show document type selector for each uploaded file:
- Culture Deck
- Engineering Handbook
- Careers Page
- Job Posting Template
- Onboarding Document
- Blog Post / Article
- Slide Deck
- Other

Also show a URL input field: "Or fetch from URL" with a text field and "Fetch" button.

After upload show each document as a card with:
- Document name
- Document type badge
- Extraction status: Pending / Analyzing / Complete / Failed
- When complete: show count of fields extracted -- "Found 12 fields"
- Expand to see which specific fields were found

**Section 2: Synthesized Draft**

Only visible after at least one document has been processed.

Show a completion meter: "Profile completeness: 67% (18 of 27 fields filled)"

Show the synthesized draft as an editable form. Each field shows:
- The extracted value (pre-filled)
- A small source badge showing which document it came from
- Edit pencil to modify
- Confidence indicator: green dot (high), amber dot (medium), red dot (low)

Low confidence fields are highlighted in amber with a note: "We found this but are not fully confident. Please verify."

Missing fields are shown in red with a note: "Not found in any document. Fill in manually or upload another document."

**Section 3: Questions to Fill Gaps**

Show the suggested questions Claude identified based on missing fields:

Each question displayed as a card:
- Question text
- Field it fills
- Why it matters for matching
- Text input for the answer

At the bottom: "Apply to Company Profile" button -- calls `/api/company/apply-draft` with the reviewed and edited data.

---

### New Company Profile Creation Flow (`app/dashboard/companies/new/page.tsx`)

Update the new company creation flow to offer two paths upfront:

**Path A: Start with Documents**
Large card with upload icon.
"Upload your culture deck, engineering handbook, or any company documents. We will extract everything automatically."
"Upload Documents →"

**Path B: Fill Out Manually**
Smaller card.
"Prefer to fill out the form yourself?"
"Start with blank form →"

If Path A is chosen: create a blank company profile first with just the company name, then redirect to the documents tab.

---

## Document Type Detection

Add smart document type detection. When a file is uploaded analyze the first 500 characters of extracted text and suggest the document type automatically:

```typescript
export function detectDocumentType(filename: string, textPreview: string): string {
  const lower = filename.toLowerCase() + ' ' + textPreview.toLowerCase()

  if (lower.includes('culture') || lower.includes('values') || lower.includes('who we are')) {
    return 'culture_deck'
  }
  if (lower.includes('engineering') && (lower.includes('handbook') || lower.includes('guide'))) {
    return 'engineering_handbook'
  }
  if (lower.includes('onboarding') || lower.includes('first day') || lower.includes('welcome to')) {
    return 'onboarding_doc'
  }
  if (lower.includes('careers') || lower.includes('join us') || lower.includes('why work')) {
    return 'careers_page'
  }
  if (lower.includes('job description') || lower.includes('responsibilities') || lower.includes('requirements')) {
    return 'job_posting_template'
  }
  if (lower.includes('slide') || lower.includes('presentation') || lower.includes('.pptx')) {
    return 'slide_deck'
  }

  return 'other'
}
```

---

## Profile Completeness Score

Calculate and display profile completeness based on which fields are filled:

```typescript
export function calculateCompanyProfileCompleteness(profile: any): number {
  const fields = [
    // High value fields (3 points each)
    { field: 'engineering_values', weight: 3 },
    { field: 'engineering_culture', weight: 3 },
    { field: 'traits_of_successful_engineers', weight: 3 },
    { field: 'traits_that_struggle_here', weight: 3 },
    { field: 'why_engineers_join', weight: 3 },
    { field: 'why_engineers_leave', weight: 3 },

    // Tech stack (2 points each)
    { field: 'core_languages', weight: 2 },
    { field: 'core_frameworks', weight: 2 },
    { field: 'core_infrastructure', weight: 2 },

    // Culture signals (2 points each)
    { field: 'remote_policy', weight: 2 },
    { field: 'oncall_expectations', weight: 2 },
    { field: 'deployment_frequency', weight: 2 },
    { field: 'code_review_culture', weight: 2 },
    { field: 'architecture_philosophy', weight: 2 },

    // Benefits (1 point each)
    { field: 'base_comp_philosophy', weight: 1 },
    { field: 'equity_structure', weight: 1 },
    { field: 'health_benefits', weight: 1 },
    { field: 'pto_policy', weight: 1 },
    { field: 'learning_and_development', weight: 1 },

    // Process (1 point each)
    { field: 'interview_process_overview', weight: 1 },
    { field: 'typical_timeline', weight: 1 },
  ]

  const maxScore = fields.reduce((sum, f) => sum + f.weight, 0)
  const actualScore = fields.reduce((sum, f) => {
    const value = profile[f.field]
    const hasValue = value && (Array.isArray(value) ? value.length > 0 : value.length > 10)
    return sum + (hasValue ? f.weight : 0)
  }, 0)

  return Math.round((actualScore / maxScore) * 100)
}
```

Show the completeness score prominently on the company profile card in the companies list. Companies with low completeness get a nudge: "Complete your profile to improve match quality."

---

## Navigation Updates

No new navigation items needed. The document ingestion is part of the existing company profile page as a new tab.

Add a visual indicator on the companies list page showing profile completeness for each company as a colored progress bar under the company name.

---

## Build Order

1. Run the new SQL (company_documents and company_profile_drafts tables)
2. Run the storage bucket SQL
3. Build `app/api/company/ingest-document/route.ts`
4. Build `app/api/company/apply-draft/route.ts`
5. Build `app/api/company/documents/route.ts`
6. Add the `detectDocumentType` utility to `lib/utils.ts`
7. Add the `calculateCompanyProfileCompleteness` utility to `lib/utils.ts`
8. Update `app/dashboard/companies/[id]/page.tsx` to add the From Documents tab
9. Update `app/dashboard/companies/new/page.tsx` to offer two creation paths
10. Update the companies list page to show completeness scores
11. Test with a real PDF -- upload a company culture deck and verify fields are extracted correctly

---

## What Success Looks Like

A recruiter downloads their company culture deck as a PDF. They drag it into TalentAgent. Within 60 seconds they see a draft company profile with 15-20 fields pre-populated, each one showing the specific excerpt from the document that was used as evidence. They review it, correct two fields that were slightly off, answer three questions about things the deck did not cover, and click Apply.

Total time: under five minutes. Total form filling: near zero.

That is the recruiter onboarding experience that creates word of mouth.

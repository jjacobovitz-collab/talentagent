import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const companyProfileId = searchParams.get('companyProfileId')

  if (!companyProfileId) {
    return NextResponse.json({ error: 'companyProfileId required' }, { status: 400 })
  }

  const [docsRes, draftRes] = await Promise.all([
    supabase
      .from('company_documents')
      .select('id, document_name, document_type, file_type, extraction_status, extracted_at, extracted_data, created_at')
      .eq('company_profile_id', companyProfileId)
      .eq('recruiter_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('company_profile_drafts')
      .select('*')
      .eq('company_profile_id', companyProfileId)
      .eq('recruiter_id', user.id)
      .maybeSingle()
  ])

  return NextResponse.json({ documents: docsRes.data || [], draft: draftRes.data })
}

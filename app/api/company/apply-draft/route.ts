import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyProfileId, approvedData } = await request.json()

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

  await supabase.from('company_profile_drafts').update({
    review_status: 'applied',
    applied_at: new Date().toISOString()
  }).eq('company_profile_id', companyProfileId)

  return NextResponse.json({ success: true, profile: updated })
}

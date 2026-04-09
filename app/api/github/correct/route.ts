import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { corrections } = await request.json()
  // corrections: { field_path: string, original_value: any, corrected_value: any, context: string }[]

  const { data: profile } = await supabase
    .from('github_profiles')
    .select('technical_fingerprint')
    .eq('user_id', user.id)
    .single()

  // Apply corrections to fingerprint
  const fingerprint = profile?.technical_fingerprint || {}

  for (const correction of corrections) {
    // Store corrections alongside original values
    if (!fingerprint.candidate_corrections) fingerprint.candidate_corrections = []
    fingerprint.candidate_corrections.push({
      ...correction,
      corrected_at: new Date().toISOString()
    })
  }

  await supabase.from('github_profiles').update({
    technical_fingerprint: fingerprint
  }).eq('user_id', user.id)

  // Update onboarding progress
  const { updateOnboardingProgress } = await import('@/lib/github/ingestion')
  await updateOnboardingProgress(supabase, user.id, { fingerprint_reviewed: true })

  return NextResponse.json({ success: true })
}

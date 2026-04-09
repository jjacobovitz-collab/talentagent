import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: linkedin } = await supabase
    .from('linkedin_profiles')
    .select('parse_status, headline, total_experience_years, parsed_at')
    .eq('user_id', user.id)
    .single()

  const { data: crossRef } = await supabase
    .from('profile_cross_references')
    .select('consistency_score, consistency_rating, analyzed_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ linkedin, crossRef })
}

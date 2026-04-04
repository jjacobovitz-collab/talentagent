import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  let userId: string | null = null

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    // Cron job: sync all users
    const supabase = createAdminClient()
    const { data: profiles } = await supabase
      .from('github_profiles')
      .select('user_id')
      .eq('ingestion_status', 'complete')

    let synced = 0
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (const profile of profiles ?? []) {
      await fetch(`${appUrl}/api/github/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ userId: profile.user_id }),
      }).catch(console.error)
      synced++
    }

    return NextResponse.json({ synced })
  }

  // User-triggered sync
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  userId = user.id
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Fire and forget
  fetch(`${appUrl}/api/github/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ userId }),
  }).catch(console.error)

  return NextResponse.json({ started: true })
}

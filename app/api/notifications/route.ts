import { NextRequest, NextResponse } from 'next/server'
// NextRequest needed for PATCH handler
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notifications: [], unread: 0 })

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const unread = notifications?.filter(n => !n.read).length ?? 0

  return NextResponse.json({ notifications: notifications ?? [], unread })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json()

  if (ids?.length) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids)
      .eq('user_id', user.id)
  } else {
    // Mark all read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
  }

  return NextResponse.json({ success: true })
}

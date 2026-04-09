import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: linkedinData } = profile?.role === 'candidate'
    ? await supabase.from('linkedin_profiles').select('parse_status').eq('user_id', user.id).single()
    : { data: null }

  const { data: crossRefData } = profile?.role === 'candidate' && linkedinData?.parse_status === 'complete'
    ? await supabase.from('profile_cross_references').select('consistency_score').eq('user_id', user.id).single()
    : { data: null }

  const linkedinStatusProp = linkedinData ? {
    parse_status: linkedinData.parse_status,
    consistency_score: crossRefData?.consistency_score ?? null,
  } : null

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar profile={profile} linkedinStatus={linkedinStatusProp} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#0F172A] border-b border-white/10 px-6 py-3 flex items-center justify-end">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

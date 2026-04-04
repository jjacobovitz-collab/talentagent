import { createClient } from '@/lib/supabase/server'
import AgentSettingsClient from './AgentSettingsClient'

export default async function AgentSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('agent_settings')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Agent Settings</h1>
        <p className="text-slate-500 mt-1">Control what your agent does on your behalf.</p>
      </div>
      <AgentSettingsClient userId={user!.id} initialSettings={settings} />
    </div>
  )
}

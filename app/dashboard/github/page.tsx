import { createClient } from '@/lib/supabase/server'
import GitHubPageClient from './GitHubPageClient'

export default async function GitHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: githubProfile } = await supabase
    .from('github_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">GitHub Integration</h1>
        <p className="text-slate-500 mt-1">
          Connect your GitHub so your agent can build a technical fingerprint from your real code.
        </p>
      </div>
      <GitHubPageClient githubProfile={githubProfile} />
    </div>
  )
}

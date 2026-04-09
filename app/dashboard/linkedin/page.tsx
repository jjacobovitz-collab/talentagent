import { createClient } from '@/lib/supabase/server'
import LinkedInPageClient from './LinkedInPageClient'

export default async function LinkedInPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: linkedinProfile } = await supabase
    .from('linkedin_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const { data: crossReference } = await supabase
    .from('profile_cross_references')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">LinkedIn Integration</h1>
        <p className="text-slate-500 mt-1">
          Cross-reference your employment history with your GitHub activity.
        </p>
      </div>
      <LinkedInPageClient linkedinProfile={linkedinProfile} crossReference={crossReference} />
    </div>
  )
}

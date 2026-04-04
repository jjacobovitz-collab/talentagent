import { createClient } from '@/lib/supabase/server'
import CandidateProfileForm from '@/components/CandidateProfileForm'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: candidateProfile } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Your Profile</h1>
        <p className="text-slate-500 mt-1">
          Build a rich profile that goes beyond a resume. Be honest — it helps matching.
        </p>
      </div>

      <CandidateProfileForm
        userId={user!.id}
        initialData={candidateProfile}
      />
    </div>
  )
}

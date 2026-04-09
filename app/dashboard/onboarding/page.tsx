import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingFlow from './OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [githubRes, onboardingRes, candidateRes] = await Promise.all([
    supabase.from('github_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('onboarding_sessions').select('*').eq('user_id', user.id).single(),
    supabase.from('candidate_profiles').select('*').eq('user_id', user.id).single(),
  ])

  return (
    <OnboardingFlow
      userId={user.id}
      githubProfile={githubRes.data}
      onboardingSession={onboardingRes.data}
      candidateProfile={candidateRes.data}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import CompanyProfileForm from '@/components/CompanyProfileForm'

export default async function NewCompanyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">New Company Profile</h1>
        <p className="text-slate-500 mt-1">
          Set up once. Every role at this company inherits this context automatically.
          Takes about 15 minutes. Auto-saves as you type.
        </p>
      </div>
      <CompanyProfileForm recruiterId={user!.id} />
    </div>
  )
}

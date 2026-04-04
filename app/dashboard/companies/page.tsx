import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CompaniesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: companies } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('recruiter_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Company Profiles</h1>
          <p className="text-slate-500 mt-1">
            Set up once. Every role at that company inherits this context automatically.
          </p>
        </div>
        <Link
          href="/dashboard/companies/new"
          className="bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
        >
          + New Company
        </Link>
      </div>

      {(!companies || companies.length === 0) ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="text-4xl mb-4">🏢</div>
          <h2 className="font-semibold text-[#0F172A] mb-2">No company profiles yet</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Add your first company profile to dramatically improve matching quality across all your roles.
            Takes about 15 minutes. Benefits every role you create after.
          </p>
          <Link
            href="/dashboard/companies/new"
            className="inline-block bg-[#6366F1] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
          >
            Create company profile
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {companies.map((company: any) => (
            <div key={company.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#0F172A] text-lg">{company.company_name}</h3>
                    {company.company_stage && (
                      <span className="px-2 py-0.5 bg-[#6366F1]/10 text-[#6366F1] text-xs rounded-full capitalize">
                        {company.company_stage.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {(company.core_languages || []).slice(0, 5).map((lang: string) => (
                      <span key={lang} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                        {lang}
                      </span>
                    ))}
                    {(company.core_frameworks || []).slice(0, 3).map((fw: string) => (
                      <span key={fw} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                        {fw}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-500 text-sm">
                    {company.industry && `${company.industry} · `}
                    {company.company_size && `${company.company_size} employees`}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/dashboard/companies/${company.id}`}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-[#6366F1] hover:text-[#6366F1] transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/dashboard/agents/new?company=${company.id}`}
                    className="px-4 py-2 bg-[#6366F1] text-white rounded-lg text-sm hover:bg-[#5558e8] transition-colors"
                  >
                    Add Role
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CompanyTabs from './CompanyTabs'

export default async function EditCompanyPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: company, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('id', params.id)
    .eq('recruiter_id', user!.id)
    .single()

  if (error || !company) notFound()

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/companies" className="hover:text-[#6366F1]">Companies</Link>
        <span>/</span>
        <span>{company.company_name}</span>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">{company.company_name}</h1>
        <p className="text-slate-500 mt-1">Manual tab auto-saves as you type. Documents tab extracts fields from uploaded files.</p>
      </div>
      <CompanyTabs recruiterId={user!.id} initialData={company} companyId={params.id} />
    </div>
  )
}

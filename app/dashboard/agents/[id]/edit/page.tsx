import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BuyerAgentForm from '@/components/BuyerAgentForm'
import Link from 'next/link'

export default async function EditAgentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agent, error } = await supabase
    .from('buyer_agents')
    .select('*')
    .eq('id', params.id)
    .eq('recruiter_id', user!.id)
    .single()

  if (error || !agent) notFound()

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/agents" className="hover:text-[#6366F1]">Buyer Agents</Link>
        <span>/</span>
        <Link href={`/dashboard/agents/${params.id}`} className="hover:text-[#6366F1]">{agent.role_title}</Link>
        <span>/</span>
        <span>Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-8">Edit Agent</h1>
      <BuyerAgentForm initialData={agent} agentId={params.id} />
    </div>
  )
}

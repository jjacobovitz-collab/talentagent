import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AgentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agents } = await supabase
    .from('buyer_agents')
    .select('*')
    .eq('recruiter_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Buyer Agents</h1>
          <p className="text-slate-500 mt-1">Each agent represents a role you are hiring for.</p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
        >
          + New Agent
        </Link>
      </div>

      {(!agents || agents.length === 0) ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-400 text-lg mb-4">No buyer agents yet</p>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent: any) => (
            <Link
              key={agent.id}
              href={`/dashboard/agents/${agent.id}`}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:border-[#6366F1] transition-colors block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{agent.role_title}</h3>
                  <p className="text-slate-500 text-sm mt-0.5">{agent.company_name}</p>
                  {agent.comp_min && agent.comp_max && (
                    <p className="text-slate-400 text-xs mt-1">
                      ${(agent.comp_min / 1000).toFixed(0)}k – ${(agent.comp_max / 1000).toFixed(0)}k
                    </p>
                  )}
                </div>
                <span className="text-[#6366F1] text-sm font-medium">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

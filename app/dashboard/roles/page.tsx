import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RolesPage() {
  const supabase = createClient()

  // Fetch all buyer agents (roles) visible to candidates
  const { data: agents } = await supabase
    .from('buyer_agents')
    .select('id, role_title, company_name, comp_min, comp_max, actual_remote_flexibility, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Open Roles</h1>
        <p className="text-slate-500 mt-1">Roles where recruiters are actively using TalentAgent to find candidates.</p>
      </div>

      {(!agents || agents.length === 0) ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <p className="text-slate-400">No roles posted yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent: any) => (
            <Link
              key={agent.id}
              href={`/dashboard/roles/${agent.id}`}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:border-[#6366F1] transition-colors block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{agent.role_title}</h3>
                  <p className="text-slate-500 text-sm mt-0.5">{agent.company_name}</p>
                  <div className="flex gap-4 mt-2">
                    {agent.comp_min && agent.comp_max && (
                      <span className="text-slate-400 text-xs">
                        ${(agent.comp_min / 1000).toFixed(0)}k – ${(agent.comp_max / 1000).toFixed(0)}k
                      </span>
                    )}
                    {agent.actual_remote_flexibility && (
                      <span className="text-slate-400 text-xs">{agent.actual_remote_flexibility}</span>
                    )}
                  </div>
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

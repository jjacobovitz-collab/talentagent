'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'candidate' | 'recruiter'
}

interface LinkedInStatus {
  parse_status: string | null
  consistency_score: number | null
}

interface SidebarProps {
  profile: Profile | null
  linkedinStatus?: LinkedInStatus | null
}

const candidateNav = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/dashboard/profile', label: 'My Profile', icon: '👤' },
  { href: '/dashboard/opportunities', label: 'Opportunities', icon: '🎯' },
  { href: '/dashboard/github', label: 'GitHub', icon: '🐙' },
  { href: '/dashboard/linkedin', label: 'LinkedIn', icon: '🔗' },
  { href: '/dashboard/agent', label: 'Agent Settings', icon: '⚙️' },
  { href: '/dashboard/roles', label: 'Browse Roles', icon: '📋' },
]

const recruiterNav = [
  { href: '/dashboard', label: 'Overview', icon: '◈' },
  { href: '/dashboard/companies', label: 'Companies', icon: '🏢' },
  { href: '/dashboard/agents', label: 'Buyer Agents', icon: '🤖' },
  { href: '/dashboard/integrations', label: 'Integrations', icon: '🔌' },
  { href: '/dashboard/matches', label: 'Match Queue', icon: '🎯' },
  { href: '/dashboard/roles', label: 'Roles', icon: '📋' },
]

export default function Sidebar({ profile, linkedinStatus }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const nav = profile?.role === 'recruiter' ? recruiterNav : candidateNav

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-[#0F172A] flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="text-white font-bold text-xl">
          TalentAgent
        </Link>
        <p className="text-slate-400 text-xs mt-1 capitalize">
          {profile?.role ?? 'user'}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const isLinkedIn = item.href === '/dashboard/linkedin'

          // LinkedIn status dot
          let linkedInDot: React.ReactNode = null
          let linkedInBadge: React.ReactNode = null
          if (isLinkedIn && profile?.role === 'candidate') {
            if (!linkedinStatus || !linkedinStatus.parse_status) {
              linkedInDot = <span className="w-2 h-2 rounded-full bg-slate-400 ml-auto shrink-0" />
            } else if (linkedinStatus.parse_status === 'parsing') {
              linkedInDot = <span className="w-2 h-2 rounded-full bg-[#F59E0B] ml-auto shrink-0 animate-pulse" />
            } else if (linkedinStatus.parse_status === 'complete') {
              linkedInDot = <span className="w-2 h-2 rounded-full bg-[#10B981] ml-auto shrink-0" />
              if (linkedinStatus.consistency_score != null) {
                linkedInBadge = (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] shrink-0">
                    {linkedinStatus.consistency_score}
                  </span>
                )
              }
            }
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#6366F1] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {linkedInBadge}
              {linkedInDot}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="px-4 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">
            {profile?.full_name ?? profile?.email ?? 'User'}
          </p>
          <p className="text-slate-400 text-xs truncate">{profile?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-4 py-2 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

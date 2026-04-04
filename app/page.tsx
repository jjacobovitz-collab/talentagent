import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <span className="text-xl font-bold">TalentAgent</span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-slate-300 hover:text-white text-sm">
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-[#6366F1] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#5558e8] transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-24 px-8 text-center max-w-4xl mx-auto">
        <div className="inline-block bg-[#6366F1]/20 text-[#818CF8] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          Powered by Claude
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Recruiting that reads between
          <span className="text-[#6366F1]"> the lines</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
          Candidates build rich profiles beyond a resume. Recruiters create buyer agents with hidden context.
          Claude produces structured fit assessments that surface what actually matters.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/auth/signup"
            className="bg-[#6366F1] text-white px-7 py-3.5 rounded-xl font-medium hover:bg-[#5558e8] transition-colors"
          >
            Build my profile
          </Link>
          <Link
            href="/auth/signup"
            className="border border-white/20 text-white px-7 py-3.5 rounded-xl font-medium hover:border-white/40 transition-colors"
          >
            I&apos;m hiring
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '👤',
              title: 'Rich Candidate Profiles',
              description: 'Go beyond a resume. Document systems built, hardest problems solved, honest skill ratings, and what you actually want.',
            },
            {
              icon: '🤖',
              title: 'Buyer Agents',
              description: "Recruiters add what the JD can't say — why candidates really failed, hidden dealbreakers, what the HM actually cares about.",
            },
            {
              icon: '⚡',
              title: 'AI Fit Assessment',
              description: 'Claude analyzes every dimension and produces a structured report with scores, flags, and questions for the human screen.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#6366F1]/40 transition-colors"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="space-y-6">
          {[
            { step: '01', title: 'Candidate builds their profile', desc: 'Seven sections covering technical depth, systems built, honest self-assessment, and work preferences.' },
            { step: '02', title: 'Recruiter creates a buyer agent', desc: 'Upload the JD plus the hidden context: why last candidates failed, what the HM actually cares about, real dealbreakers.' },
            { step: '03', title: 'Claude generates a fit report', desc: 'Scores, requirement-by-requirement analysis, green/yellow/red flags, and questions for the human screen.' },
            { step: '04', title: 'Both sides get signal', desc: 'Candidates see their fit score per role. Recruiters see ranked assessments with evidence from actual profile text.' },
          ].map((item) => (
            <div key={item.step} className="flex gap-6 items-start">
              <span className="text-[#6366F1] font-bold text-lg shrink-0 w-8">{item.step}</span>
              <div>
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 text-center">
        <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-2xl p-12 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to hire smarter?</h2>
          <p className="text-slate-400 mb-8">Join TalentAgent and stop guessing on fit.</p>
          <Link
            href="/auth/signup"
            className="bg-[#6366F1] text-white px-8 py-3.5 rounded-xl font-medium hover:bg-[#5558e8] transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 text-center text-slate-500 text-sm border-t border-white/10">
        &copy; {new Date().getFullYear()} TalentAgent &mdash; Powered by Anthropic Claude
      </footer>
    </div>
  )
}

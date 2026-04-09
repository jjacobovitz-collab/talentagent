'use client'

const BOOKMARKLET_JS = `javascript:(function(){var text=document.body.innerText;var url=window.location.href;window.open('https://usetalentagent.com/dashboard/agents/new?jd='+encodeURIComponent(text.substring(0,5000))+'&source='+encodeURIComponent(url));})();`

export default function BookmarkletPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Browser Bookmarklet</h1>
        <p className="text-slate-500 mt-1">Import job descriptions instantly from any job posting page.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-[#0F172A] mb-2">How it works</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          Save the button below to your browser bookmarks bar. When you are on any job posting page — Greenhouse, Lever, LinkedIn, a company careers page — click the bookmark to instantly import the JD into TalentAgent. The job description will be pre-filled and parsing will start automatically.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center mb-6">
        <p className="text-slate-500 text-sm mb-6">Drag this button to your browser bookmarks bar:</p>

        {/* Draggable bookmarklet */}
        {/* eslint-disable-next-line react/jsx-no-script-url */}
        <a
          href={BOOKMARKLET_JS}
          className="inline-block bg-[#0F172A] text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg cursor-grab active:cursor-grabbing select-none"
          onClick={e => {
            e.preventDefault()
            alert('Drag this button to your bookmarks bar, then click it on any job posting page.')
          }}
          draggable
        >
          🤖 Import to TalentAgent
        </a>

        <p className="text-xs text-slate-400 mt-6">
          Drag the button above to your browser bookmarks bar
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-[#0F172A] mb-3">Step-by-step instructions</h2>
        <ol className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white text-xs flex items-center justify-center shrink-0 font-bold">1</span>
            <span>Make sure your browser bookmarks bar is visible. In Chrome: View → Always Show Bookmarks Bar.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white text-xs flex items-center justify-center shrink-0 font-bold">2</span>
            <span>Drag the <strong>&quot;Import to TalentAgent&quot;</strong> button above to your bookmarks bar.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white text-xs flex items-center justify-center shrink-0 font-bold">3</span>
            <span>Navigate to any job posting page (Greenhouse, Lever, LinkedIn, etc.).</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white text-xs flex items-center justify-center shrink-0 font-bold">4</span>
            <span>Click the bookmark. A new TalentAgent tab opens with the JD already parsed.</span>
          </li>
        </ol>
      </div>
    </div>
  )
}

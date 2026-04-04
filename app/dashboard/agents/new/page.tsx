import BuyerAgentForm from '@/components/BuyerAgentForm'

export default function NewAgentPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Create Buyer Agent</h1>
        <p className="text-slate-500 mt-1">
          The more context you give, the better the matching. Include what you really care about.
        </p>
      </div>
      <BuyerAgentForm />
    </div>
  )
}

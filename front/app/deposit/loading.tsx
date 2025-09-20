export default function Loading() {
  return (
    <div className="px-6 pt-28 pb-12">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-10 w-40 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
        <div className="h-56 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
      </div>
    </div>
  )
}

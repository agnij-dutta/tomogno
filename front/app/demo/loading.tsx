export default function Loading() {
  return (
    <div className="px-6 pt-28 pb-12">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-12 w-2/3 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
        <div className="h-64 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
      </div>
    </div>
  )
}

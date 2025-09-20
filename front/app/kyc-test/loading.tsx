export default function Loading() {
  return (
    <div className="px-6 pt-28 pb-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/10 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

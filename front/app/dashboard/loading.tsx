export default function Loading() {
  return (
    <div className="px-6 pt-28 pb-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

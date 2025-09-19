export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse" />
          <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse [animation-delay:150ms]" />
          <div className="h-3 w-3 rounded-full bg-white/30 animate-pulse [animation-delay:300ms]" />
        </div>
      </section>
    </div>
  )
}

// Shown instantly on navigation while the round page renders on the server.
export default function RoundLoading() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="mb-6">
        <div className="h-8 w-40 rounded bg-neutral-800" />
        <div className="h-4 w-28 rounded bg-neutral-900 mt-2" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="h-5 w-64 max-w-full rounded bg-neutral-800" />
            <div className="h-3 w-32 rounded bg-neutral-800 mt-2" />
            <div className="h-24 rounded-lg bg-neutral-800/60 mt-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

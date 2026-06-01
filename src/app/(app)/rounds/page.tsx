import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"

const STATUS_LABEL: Record<string, string> = {
  SETUP: "Setup",
  BETTING: "Betting open",
  CLOSED: "Closed",
  RESULTS: "Results in",
}

const STATUS_COLOR: Record<string, string> = {
  SETUP: "text-neutral-500",
  BETTING: "text-yellow-400",
  CLOSED: "text-neutral-400",
  RESULTS: "text-white",
}

interface RoundRow {
  id: string
  name: string
  status: string
  _count: { matches: number }
}

export default async function RoundsPage() {
  const session = await auth()
  if (!session?.user) return null

  const rounds = await db.round.findMany({
    where: { status: { not: "SETUP" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { matches: { where: { isEligible: true } } } },
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Rounds</h1>
      {rounds.length === 0 ? (
        <p className="text-neutral-400">No rounds available yet. Check back soon.</p>
      ) : (
        <div className="space-y-3">
          {rounds.map((round: RoundRow) => (
            <Link
              key={round.id}
              href={`/rounds/${round.id}`}
              className="block bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4 hover:border-yellow-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg text-white">{round.name}</p>
                  <p className="text-sm text-neutral-400 mt-0.5">
                    {round._count.matches} eligible match
                    {round._count.matches !== 1 ? "es" : ""}
                  </p>
                </div>
                <span className={`text-sm font-medium ${STATUS_COLOR[round.status]}`}>
                  {STATUS_LABEL[round.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

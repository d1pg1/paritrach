import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { Suspense } from "react"
import { SeasonSelector } from "@/components/SeasonSelector"

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

export default async function RoundsPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string }>
}) {
  const session = await auth()
  if (!session?.user) return null

  const t = await getTranslations("rounds")
  const { seasonId: rawSeasonId } = await searchParams
  const seasonId = rawSeasonId && rawSeasonId !== "current" ? rawSeasonId : null

  const [seasons, rounds] = await Promise.all([
    db.season.findMany({
      orderBy: { archivedAt: "desc" },
      select: { id: true, name: true },
    }),
    db.round.findMany({
      where: { status: { not: "SETUP" }, seasonId: seasonId ?? null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { matches: { where: { isEligible: true } } } },
      },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
      {seasons.length > 0 && (
        <Suspense fallback={<div className="h-10 mb-6" />}>
          <SeasonSelector seasons={seasons} currentSeasonId={seasonId} />
        </Suspense>
      )}
      {rounds.length === 0 ? (
        <p className="text-neutral-400">{t("empty")}</p>
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
                    {t("matchCount", { count: round._count.matches })}
                  </p>
                </div>
                <span className={`text-sm font-medium ${STATUS_COLOR[round.status]}`}>
                  {t(`status.${round.status}` as Parameters<typeof t>[0])}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

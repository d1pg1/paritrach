import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { SeasonSelector } from "@/components/SeasonSelector"

export default async function ScoreboardPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string }>
}) {
  const session = await auth()
  if (!session?.user) return null

  const t = await getTranslations("scoreboard")
  const { seasonId: rawSeasonId } = await searchParams
  const seasonId = rawSeasonId && rawSeasonId !== "current" ? rawSeasonId : null

  const [seasons, users, winningBets, contestants] = await Promise.all([
    db.season.findMany({
      orderBy: { archivedAt: "desc" },
      select: { id: true, name: true },
    }),
    db.user.findMany({ select: { id: true, username: true, nickname: true } }),
    db.bet.findMany({
      where: { isWinner: true, round: { seasonId: seasonId ?? null } },
      select: { userId: true, coefficient: true },
    }),
    db.seasonContestant.findMany({
      where: { seasonId: seasonId ?? null },
      select: { userId: true },
    }),
  ])

  const contestantIds = new Set(contestants.map((c) => c.userId))
  const filteredUsers = contestantIds.size > 0
    ? users.filter((u) => contestantIds.has(u.id))
    : users

  const statsMap = new Map<string, { points: number; coefSum: number }>()
  for (const bet of winningBets) {
    const entry = statsMap.get(bet.userId) ?? { points: 0, coefSum: 0 }
    entry.points += 1
    entry.coefSum += bet.coefficient
    statsMap.set(bet.userId, entry)
  }

  const rows = filteredUsers
    .map((u) => {
      const stats = statsMap.get(u.id) ?? { points: 0, coefSum: 0 }
      return { id: u.id, displayName: u.nickname ?? u.username, ...stats }
    })
    .sort((a, b) => b.points !== a.points ? b.points - a.points : b.coefSum - a.coefSum)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
      {seasons.length > 0 && (
        <Suspense fallback={<div className="h-10 mb-6" />}>
          <SeasonSelector seasons={seasons} currentSeasonId={seasonId} />
        </Suspense>
      )}
      {rows.length === 0 ? (
        <p className="text-neutral-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-800">
                <th className="pb-3 pr-4 w-10">{t("rank")}</th>
                <th className="pb-3 pr-4">{t("player")}</th>
                <th className="pb-3 pr-4 text-right">{t("points")}</th>
                <th className="pb-3 text-right">{t("coefSum")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-neutral-800/50 ${
                    row.id === session.user.id ? "text-yellow-400" : ""
                  }`}
                >
                  <td className="py-3 pr-4 font-mono text-neutral-500">{i + 1}</td>
                  <td className="py-3 pr-4 font-medium">{row.displayName}</td>
                  <td className="py-3 pr-4 text-right font-bold">{row.points}</td>
                  <td className="py-3 text-right text-neutral-400">{row.coefSum.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

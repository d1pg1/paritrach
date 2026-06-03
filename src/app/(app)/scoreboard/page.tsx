import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"
import { after } from "next/server"
import { SeasonSelector } from "@/components/SeasonSelector"
import { UserAvatar } from "@/components/UserAvatar"
import { settleRound } from "@/lib/settle-round"

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

  const [seasons, users, winningBets, allBets, contestants] = await Promise.all([
    db.season.findMany({
      orderBy: { archivedAt: "desc" },
      select: { id: true, name: true },
    }),
    db.user.findMany({ select: { id: true, username: true, nickname: true, logoUrl: true } }),
    db.bet.findMany({
      where: { isWinner: true, round: { seasonId: seasonId ?? null } },
      select: { userId: true, roundId: true, coefficient: true },
    }),
    db.bet.findMany({
      where: { round: { seasonId: seasonId ?? null } },
      select: { userId: true, roundId: true },
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

  const roundsMap = new Map<string, Set<string>>()
  for (const bet of allBets) {
    const rounds = roundsMap.get(bet.userId) ?? new Set<string>()
    rounds.add(bet.roundId)
    roundsMap.set(bet.userId, rounds)
  }

  // Group winning bets: userId → roundId → coefficients[]
  const winsByRound = new Map<string, Map<string, number[]>>()
  for (const bet of winningBets) {
    const byRound = winsByRound.get(bet.userId) ?? new Map<string, number[]>()
    const coefs = byRound.get(bet.roundId) ?? []
    coefs.push(bet.coefficient)
    byRound.set(bet.roundId, coefs)
    winsByRound.set(bet.userId, byRound)
  }

  // points = total won bets; coefSum = sum of per-round products
  const statsMap = new Map<string, { points: number; coefSum: number }>()
  for (const [userId, byRound] of winsByRound) {
    let points = 0
    let coefSum = 0
    for (const coefs of byRound.values()) {
      points += coefs.length
      coefSum += coefs.reduce((acc, c) => acc * c, 1)
    }
    statsMap.set(userId, { points, coefSum })
  }

  const rows = filteredUsers
    .map((u) => {
      const stats = statsMap.get(u.id) ?? { points: 0, coefSum: 0 }
      const rounds = roundsMap.get(u.id)?.size ?? 0
      return { id: u.id, displayName: u.nickname ?? u.username, logoUrl: u.logoUrl, rounds, ...stats }
    })
    .sort((a, b) => b.points !== a.points ? b.points - a.points : b.coefSum - a.coefSum)

  after(async () => {
    const cutoff = new Date(Date.now() - 100 * 60 * 1000)
    const settling = await db.round.findMany({
      where: { status: "BETTING", matches: { some: { isEligible: true, startTime: { lte: cutoff } } } },
      select: { id: true },
    })
    await Promise.allSettled(settling.map((r) => settleRound(r.id)))
  })

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
                <th className="pb-3 pr-3 w-10">{t("rank")}</th>
                <th className="pb-3 pr-4">{t("player")}</th>
                <th className="pb-3 pr-4 text-right">{t("rounds")}</th>
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
                  <td className="py-3 pr-3 font-mono text-neutral-500">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar logoUrl={row.logoUrl} displayName={row.displayName} size={40} />
                      <span className="font-medium">{row.displayName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right text-neutral-400">{row.rounds}</td>
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

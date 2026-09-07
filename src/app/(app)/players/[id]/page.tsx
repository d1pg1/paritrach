import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { UserAvatar } from "@/components/UserAvatar"
import { getPlayerStats } from "@/lib/player-stats"
import { computeHeadToHeadRecords } from "@/lib/h2h-scoring"

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5">
      <p className="text-xs text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return null

  const t = await getTranslations("players")
  const tMarkets = await getTranslations("betting.markets")

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, username: true, nickname: true, logoUrl: true },
  })
  if (!user) notFound()

  const [stats, rivalries] = await Promise.all([
    getPlayerStats(id),
    computeHeadToHeadRecords(id),
  ])

  const rivalIds = rivalries.map((r) => r.opponentId)
  const rivals = rivalIds.length
    ? await db.user.findMany({
        where: { id: { in: rivalIds } },
        select: { id: true, username: true, nickname: true, logoUrl: true },
      })
    : []
  const rivalById = new Map(rivals.map((r) => [r.id, r]))

  const displayName = user.nickname ?? user.username
  const marketLabel = (marketType: string) => {
    try {
      return tMarkets(marketType as Parameters<typeof tMarkets>[0])
    } catch {
      return marketType
    }
  }

  const winRatePct = stats.winRate !== null ? `${Math.round(stats.winRate * 100)}%` : "—"
  const streakLabel =
    stats.currentStreak > 0
      ? t("stats.streakWins", { count: stats.currentStreak })
      : stats.currentStreak < 0
        ? t("stats.streakLosses", { count: Math.abs(stats.currentStreak) })
        : t("stats.noStreak")

  return (
    <div>
      <Link href="/scoreboard" className="text-sm text-neutral-500 hover:text-yellow-400 transition-colors">
        {t("backLink")}
      </Link>

      <div className="mt-4 grid md:grid-cols-2 gap-6 items-start">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center md:sticky md:top-6">
          <UserAvatar logoUrl={user.logoUrl} displayName={displayName} size={160} />
          <h1 className="text-2xl font-bold text-white mt-5">{displayName}</h1>
          {stats.memberSince && (
            <p className="text-sm text-neutral-500 mt-1" suppressHydrationWarning>
              {t("memberSince", { date: stats.memberSince.toLocaleDateString(undefined, { year: "numeric", month: "long" }) })}
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={t("stats.winRate")}
              value={winRatePct}
              sub={t("stats.record", { wins: stats.wins, losses: stats.losses })}
            />
            <StatCard label={t("stats.totalBets")} value={stats.totalBets} sub={t("stats.roundsPlayed", { count: stats.roundsPlayed })} />
            <StatCard
              label={t("stats.currentStreak")}
              value={streakLabel}
              sub={t("stats.bestStreak", { count: stats.bestWinStreak })}
            />
            <StatCard
              label={t("stats.avgOdds")}
              value={stats.avgCoefficient !== null ? stats.avgCoefficient.toFixed(2) : "—"}
            />
            <StatCard
              label={t("stats.favoriteMarket")}
              value={stats.favoriteMarket ? marketLabel(stats.favoriteMarket.marketType) : "—"}
              sub={stats.favoriteMarket ? t("stats.betCount", { count: stats.favoriteMarket.count }) : undefined}
            />
            <StatCard
              label={t("stats.bestMarket")}
              value={stats.bestMarket ? marketLabel(stats.bestMarket.marketType) : "—"}
              sub={stats.bestMarket ? `${Math.round(stats.bestMarket.winRate * 100)}% (${stats.bestMarket.wins}/${stats.bestMarket.settled})` : t("stats.noData")}
            />
          </div>

          {stats.biggestWin && (
            <div className="bg-neutral-900 border border-yellow-700/40 rounded-xl px-4 py-3.5">
              <p className="text-xs text-yellow-500 uppercase tracking-wide">{t("stats.biggestWin")}</p>
              <p className="text-white font-semibold mt-1">
                {stats.biggestWin.homeTeam} <span className="text-neutral-500">vs</span> {stats.biggestWin.awayTeam}
              </p>
              <p className="text-sm text-neutral-400 mt-0.5">
                {marketLabel(stats.biggestWin.marketType)}: {stats.biggestWin.selection}
                <span className="text-yellow-400 font-mono font-semibold ml-2">@{stats.biggestWin.coefficient.toFixed(2)}</span>
              </p>
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-yellow-400 mb-2">{t("headToHead.title")}</h2>
            {rivalries.length === 0 ? (
              <p className="text-sm text-neutral-500">{t("headToHead.empty")}</p>
            ) : (
              <div className="space-y-1.5">
                {rivalries.map((r) => {
                  const opponent = rivalById.get(r.opponentId)
                  if (!opponent) return null
                  const oppName = opponent.nickname ?? opponent.username
                  return (
                    <Link
                      key={r.opponentId}
                      href={`/players/${r.opponentId}`}
                      className="flex items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg px-3.5 py-2.5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar logoUrl={opponent.logoUrl} displayName={oppName} size={28} />
                        <span className="text-sm font-medium text-neutral-200 truncate">{oppName}</span>
                      </div>
                      <span className="text-sm font-mono text-neutral-400 flex-shrink-0">
                        {t("headToHead.record", { wins: r.wins, draws: r.draws, losses: r.losses })}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

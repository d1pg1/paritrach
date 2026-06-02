import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { BettingCard } from "./BettingCard"

interface MatchRow {
  id: string
  homeTeam: string
  awayTeam: string
  startTime: Date
  homeScore: number | null
  awayScore: number | null
  status: string
  isEligible: boolean
  oddsSnapshot: { oddsData: unknown } | null
  bets: {
    id: string
    userId: string
    marketType: string
    selection: string
    line: number | null
    coefficient: number
    isWinner: boolean | null
    user: { username: string }
  }[]
}

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return null

  const t = await getTranslations("round")

  const round = await db.round.findUnique({
    where: { id },
    include: {
      matches: {
        where: { isEligible: true },
        include: {
          oddsSnapshot: true,
          bets: {
            include: { user: { select: { username: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { startTime: "asc" },
      },
    },
  })

  if (!round) notFound()

  const isBettingOpen = round.status === "BETTING"
  const isResults = round.status === "RESULTS"

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{round.name}</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {isBettingOpen && t("bettingOpen")}
          {isResults && t("resultsIn")}
          {round.status === "CLOSED" && t("closed")}
        </p>
      </div>

      {round.matches.length === 0 ? (
        <p className="text-neutral-400">{t("noMatches")}</p>
      ) : (
        <div className="space-y-4">
          {(round.matches as MatchRow[]).map((match) => (
            <BettingCard
              key={match.id}
              match={match}
              existingBet={match.bets.find((b) => b.userId === session.user.id) ?? null}
              allBets={match.bets}
              currentUserId={session.user.id}
              isBettingOpen={isBettingOpen}
              isResults={isResults}
            />
          ))}
        </div>
      )}
    </div>
  )
}

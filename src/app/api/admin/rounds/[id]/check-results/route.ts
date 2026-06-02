import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fetchResultsByDate, findEspnEventForMatch, parseScores, fetchHalftimeScores, parseFirstGoal, competitionToEspnSlug } from "@/lib/apis/espn"
import { settleBet } from "@/lib/settlement"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const round = await db.round.findUnique({
    where: { id },
    include: {
      matches: {
        where: { isEligible: true },
        include: { bets: true },
      },
    },
  })
  if (!round) return new NextResponse("Round not found", { status: 404 })

  // Collect unique (date, espnSlug) combinations
  const dateSlugPairs = [
    ...new Map(
      round.matches.map((m: { startTime: Date; competition: string | null }) => {
        const date = m.startTime.toISOString().slice(0, 10)
        const slug = competitionToEspnSlug(m.competition)
        return [`${date}|${slug}`, { date, slug }]
      })
    ).values(),
  ]

  // Fetch ESPN results for each unique date+competition
  const allEvents = (
    await Promise.all(dateSlugPairs.map(({ date, slug }) => fetchResultsByDate(new Date(date), slug)))
  ).flat()

  let settled = 0
  let updated = 0

  for (const match of round.matches) {
    const espnEvent = findEspnEventForMatch(allEvents, match.homeTeam, match.awayTeam)
    if (!espnEvent) continue

    const { homeScore, awayScore, completed } = parseScores(espnEvent)
    if (!completed) continue

    const slug = competitionToEspnSlug(match.competition)
    const halftime = await fetchHalftimeScores(espnEvent.id, slug)
    const firstGoal = parseFirstGoal(espnEvent)

    await db.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        status: "FINAL",
        ...(halftime && { htHomeScore: halftime.htHomeScore, htAwayScore: halftime.htAwayScore }),
      },
    })
    updated++

    for (const bet of match.bets) {
      if (bet.isWinner !== null) continue // already settled
      const won = settleBet({
        marketType: bet.marketType,
        selection: bet.selection,
        line: bet.line,
        homeScore,
        awayScore,
        htHomeScore: halftime?.htHomeScore ?? match.htHomeScore ?? null,
        htAwayScore: halftime?.htAwayScore ?? match.htAwayScore ?? null,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        firstGoalTeam: firstGoal?.firstTeam ?? null,
      })
      if (won !== null) {
        await db.bet.update({ where: { id: bet.id }, data: { isWinner: won } })
        settled++
      }
    }
  }

  // Re-check if all eligible matches are final now
  const remaining = await db.match.count({
    where: { roundId: id, isEligible: true, status: { not: "FINAL" } },
  })
  if (remaining === 0) {
    await db.round.update({ where: { id }, data: { status: "RESULTS" } })
  }

  return NextResponse.json({ matchesUpdated: updated, betsSettled: settled, remainingMatches: remaining })
}

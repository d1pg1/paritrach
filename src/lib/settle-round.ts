import { db } from "@/lib/db"
import { fetchResultsByDate, findEspnEventForMatch, parseScores, fetchHalftimeScores, parseFirstGoal, competitionToEspnSlug } from "@/lib/apis/espn"
import { settleBet } from "@/lib/settlement"

export async function settleRound(roundId: string): Promise<{
  matchesUpdated: number
  betsSettled: number
  remainingMatches: number
}> {
  const round = await db.round.findUnique({
    where: { id: roundId },
    include: {
      matches: {
        where: { isEligible: true },
        include: { bets: true },
      },
    },
  })
  if (!round) return { matchesUpdated: 0, betsSettled: 0, remainingMatches: 0 }

  const dateSlugPairs = [
    ...new Map(
      round.matches.map((m) => {
        const date = m.startTime.toISOString().slice(0, 10)
        const slug = competitionToEspnSlug(m.competition)
        return [`${date}|${slug}`, { date, slug }]
      })
    ).values(),
  ]

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
      if (bet.isWinner !== null) continue
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

  const remaining = await db.match.count({
    where: { roundId, isEligible: true, status: { not: "FINAL" } },
  })
  if (remaining === 0) {
    await db.round.update({ where: { id: roundId }, data: { status: "RESULTS" } })
  }

  return { matchesUpdated: updated, betsSettled: settled, remainingMatches: remaining }
}

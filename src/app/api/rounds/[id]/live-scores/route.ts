import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fetchResultsByDate, findEspnEventForMatch, parseScores, competitionToEspnSlug } from "@/lib/apis/espn"
import { handleGoalDetected } from "@/lib/goal-detection"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { id } = await params

  const now = new Date()
  const matches = await db.match.findMany({
    where: {
      roundId: id,
      isEligible: true,
      startTime: { lte: now },
      status: { not: "FINAL" },
    },
    select: {
      id: true,
      homeTeam: true,
      awayTeam: true,
      startTime: true,
      competition: true,
      liveHomeScore: true,
      liveAwayScore: true,
      apiFootballId: true,
    },
  })

  if (matches.length === 0) return NextResponse.json([])

  const dateSlugPairs = [
    ...new Map(
      matches.map((m) => {
        const date = m.startTime.toISOString().slice(0, 10)
        const slug = competitionToEspnSlug(m.competition)
        return [`${date}|${slug}`, { date, slug }]
      })
    ).values(),
  ]

  const allEvents = (
    await Promise.all(dateSlugPairs.map(({ date, slug }) => fetchResultsByDate(new Date(date), slug)))
  ).flat()

  // Detect score changes and fetch goal events where needed.
  // Errors here must never crash the response — scores are more important than events.
  await Promise.allSettled(
    matches.map(async (match) => {
      const event = findEspnEventForMatch(allEvents, match.homeTeam, match.awayTeam)
      if (!event) return
      const { homeScore, awayScore } = parseScores(event)
      const prevTotal = (match.liveHomeScore ?? 0) + (match.liveAwayScore ?? 0)
      if (homeScore + awayScore > prevTotal) {
        await handleGoalDetected(match, homeScore, awayScore)
      } else if (homeScore !== match.liveHomeScore || awayScore !== match.liveAwayScore) {
        await db.match.update({ where: { id: match.id }, data: { liveHomeScore: homeScore, liveAwayScore: awayScore } })
      }
    })
  )

  // Load stored events for all in-progress matches
  const storedEvents = await db.matchEvent.findMany({
    where: { matchId: { in: matches.map((m) => m.id) } },
    orderBy: { minute: "asc" },
  })
  const eventsByMatch = storedEvents.reduce<Record<string, typeof storedEvents>>(
    (acc, ev) => { (acc[ev.matchId] ??= []).push(ev); return acc },
    {}
  )

  const results = matches.flatMap((match) => {
    const event = findEspnEventForMatch(allEvents, match.homeTeam, match.awayTeam)
    if (!event) return []
    const { homeScore, awayScore, completed } = parseScores(event)
    return [{
      matchId: match.id,
      homeScore,
      awayScore,
      completed,
      statusName: event.status.type.name,
      events: (eventsByMatch[match.id] ?? []).map((ev) => ({
        minute: ev.minute,
        team: ev.team,
        scorerName: ev.scorerName,
        eventType: ev.eventType,
      })),
    }]
  })

  return NextResponse.json(results)
}

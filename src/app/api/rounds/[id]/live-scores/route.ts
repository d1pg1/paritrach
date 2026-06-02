import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fetchResultsByDate, findEspnEventForMatch, parseScores, competitionToEspnSlug } from "@/lib/apis/espn"

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
    select: { id: true, homeTeam: true, awayTeam: true, startTime: true, competition: true },
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

  const results = matches.flatMap((match) => {
    const event = findEspnEventForMatch(allEvents, match.homeTeam, match.awayTeam)
    if (!event) return []
    const { homeScore, awayScore, completed } = parseScores(event)
    const statusName = event.status.type.name
    return [{ matchId: match.id, homeScore, awayScore, completed, statusName }]
  })

  return NextResponse.json(results)
}

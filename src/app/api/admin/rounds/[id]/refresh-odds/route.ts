import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fetchTournamentOdds, extractMarketsForMatch } from "@/lib/apis/oddspapi"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const round = await db.round.findUnique({
    where: { id },
    include: { matches: { where: { isEligible: true } } },
  })
  if (!round) return new NextResponse("Round not found", { status: 404 })
  if (round.matches.length === 0)
    return new NextResponse("No eligible matches", { status: 400 })

  const allOdds = await fetchTournamentOdds()

  let snapshotCount = 0
  for (const match of round.matches) {
    const markets = extractMarketsForMatch(allOdds, match.startTime, match.homeTeam, match.awayTeam)
    if (Object.keys(markets).length === 0) continue

    const oddsJson = JSON.parse(JSON.stringify(markets))
    await db.oddsSnapshot.upsert({
      where: { matchId: match.id },
      update: { oddsData: oddsJson, fetchedAt: new Date() },
      create: { matchId: match.id, oddsData: oddsJson },
    })
    snapshotCount++
  }

  return NextResponse.json({ snapshotsUpdated: snapshotCount })
}

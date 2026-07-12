import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { extractMarketsForMatch } from "@/lib/apis/oddspapi"
import { notifyRoundOpened } from "@/lib/telegram-notifications"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const round = await db.round.findUnique({
    where: { id },
    include: { matches: { where: { isEligible: true } } },
  })
  if (!round) return new NextResponse("Round not found", { status: 404 })
  if (round.status !== "SETUP") return new NextResponse("Round already opened", { status: 400 })
  if (round.matches.length === 0)
    return new NextResponse("No eligible matches selected", { status: 400 })

  let snapshotCount = 0
  for (let i = 0; i < round.matches.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1000))
    const match = round.matches[i]
    const markets = await extractMarketsForMatch(match.startTime, match.homeTeam, match.awayTeam, match.externalId)
    if (Object.keys(markets).length === 0) continue

    const oddsJson = JSON.parse(JSON.stringify(markets))
    await db.oddsSnapshot.upsert({
      where: { matchId: match.id },
      update: { oddsData: oddsJson, fetchedAt: new Date() },
      create: { matchId: match.id, oddsData: oddsJson },
    })
    snapshotCount++
  }

  await db.round.update({ where: { id }, data: { status: "BETTING" } })

  // Runs after the response is sent, but Next keeps the invocation alive until it
  // settles — unlike a bare un-awaited call, it can't be cut off by the runtime.
  after(() => notifyRoundOpened(id))

  return NextResponse.json({ status: "BETTING", snapshotsCreated: snapshotCount })
}

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fetchWorldCupEvents } from "@/lib/apis/odds-api"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const round = await db.round.findUnique({ where: { id } })
  if (!round) return new NextResponse("Round not found", { status: 404 })
  if (round.status !== "SETUP") return new NextResponse("Round not in SETUP state", { status: 400 })

  const events = await fetchWorldCupEvents()

  const existingIds = (
    await db.match.findMany({ where: { roundId: id }, select: { externalId: true } })
  ).map((m: { externalId: string | null }) => m.externalId)

  const toInsert = events.filter((e) => !existingIds.includes(e.id))

  await db.match.createMany({
    data: toInsert.map((e) => ({
      roundId: id,
      externalId: e.id,
      homeTeam: e.home_team,
      awayTeam: e.away_team,
      startTime: new Date(e.commence_time),
    })),
  })

  return NextResponse.json({ imported: toInsert.length, total: events.length })
}

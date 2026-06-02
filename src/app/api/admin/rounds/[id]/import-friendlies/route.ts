import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const FRIENDLIES_TOURNAMENT_ID = 851

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const round = await db.round.findUnique({ where: { id } })
  if (!round) return new NextResponse("Round not found", { status: 404 })
  if (round.status !== "SETUP") return new NextResponse("Round not in SETUP state", { status: 400 })

  const url = `https://api.oddspapi.io/v4/fixtures?tournamentId=${FRIENDLIES_TOURNAMENT_ID}&apiKey=${process.env.ODDSPAPI_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OddsPapi fixtures error: ${res.status}`)

  const events = (await res.json()) as Array<{
    fixtureId: string
    startTime: string
    participant1Name: string
    participant2Name: string
  }>

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.startTime) > now)

  const existingIds = (
    await db.match.findMany({ where: { roundId: id }, select: { externalId: true } })
  ).map((m) => m.externalId)

  const toInsert = upcoming.filter((e) => !existingIds.includes(e.fixtureId))

  await db.match.createMany({
    data: toInsert.map((e) => ({
      roundId: id,
      externalId: e.fixtureId,
      competition: "International Friendlies",
      homeTeam: e.participant1Name,
      awayTeam: e.participant2Name,
      startTime: new Date(e.startTime),
    })),
  })

  return NextResponse.json({ imported: toInsert.length, total: upcoming.length })
}

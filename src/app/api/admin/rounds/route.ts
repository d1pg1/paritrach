import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const rounds = await db.round.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true, bets: true } } },
  })
  return NextResponse.json(rounds)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return new NextResponse("Name required", { status: 400 })

  const settings = await db.settings.findUnique({ where: { id: "singleton" } })
  if (!settings?.currentSeasonId) {
    return new NextResponse("Start a season before creating rounds", { status: 400 })
  }

  const season = await db.season.findUnique({ where: { id: settings.currentSeasonId }, select: { format: true } })

  const data: { name: string; seasonId?: string; sequenceNumber?: number } = { name: name.trim() }
  if (season?.format === "H2H") {
    const lastRound = await db.round.findFirst({
      where: { seasonId: settings.currentSeasonId },
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true },
    })
    data.seasonId = settings.currentSeasonId
    data.sequenceNumber = (lastRound?.sequenceNumber ?? 0) + 1
  }

  const round = await db.round.create({ data })
  return NextResponse.json(round, { status: 201 })
}

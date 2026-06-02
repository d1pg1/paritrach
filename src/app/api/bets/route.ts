import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const roundId = searchParams.get("roundId")

  const bets = await db.bet.findMany({
    where: { userId: session.user.id, ...(roundId ? { roundId } : {}) },
    include: { match: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(bets)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { matchId, marketType, selection, line, coefficient } = await req.json()

  // Validate match exists and betting is open
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { round: true, oddsSnapshot: true },
  })
  if (!match) return new NextResponse("Match not found", { status: 404 })
  if (!match.isEligible) return new NextResponse("Match not eligible", { status: 400 })
  if (match.round.status !== "BETTING")
    return new NextResponse("Betting is not open", { status: 400 })
  if (new Date() >= match.startTime)
    return new NextResponse("Match has already started", { status: 400 })
  if (!match.oddsSnapshot) return new NextResponse("Odds not locked yet", { status: 400 })
  if (coefficient <= 1.4) return new NextResponse("Coefficient must be greater than 1.4", { status: 400 })

  // Enforce one bet per match per user
  const existing = await db.bet.findUnique({
    where: { userId_matchId: { userId: session.user.id, matchId } },
  })
  if (existing) return new NextResponse("Bet already placed for this match", { status: 409 })

  const bet = await db.bet.create({
    data: {
      userId: session.user.id,
      matchId,
      roundId: match.roundId,
      marketType,
      selection,
      line: line ?? null,
      coefficient,
    },
  })
  return NextResponse.json(bet, { status: 201 })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { betId, marketType, selection, line, coefficient } = await req.json()

  const bet = await db.bet.findUnique({ where: { id: betId }, include: { match: true } })
  if (!bet || bet.userId !== session.user.id)
    return new NextResponse("Bet not found", { status: 404 })
  if (new Date() >= bet.match.startTime)
    return new NextResponse("Cannot edit — match already started", { status: 400 })
  if (coefficient <= 1.4) return new NextResponse("Coefficient must be greater than 1.4", { status: 400 })

  const updated = await db.bet.update({
    where: { id: betId },
    data: { marketType, selection, line: line ?? null, coefficient },
  })
  return NextResponse.json(updated)
}

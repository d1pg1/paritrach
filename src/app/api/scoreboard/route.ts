import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const roundId = searchParams.get("roundId")

  const bets = await db.bet.findMany({
    where: {
      isWinner: true,
      ...(roundId ? { roundId } : {}),
    },
    include: { user: { select: { id: true, username: true } } },
  })

  const map = new Map<string, { userId: string; username: string; points: number; coefSum: number }>()

  for (const bet of bets) {
    const entry = map.get(bet.userId) ?? {
      userId: bet.userId,
      username: bet.user.username,
      points: 0,
      coefSum: 0,
    }
    entry.points += 1
    entry.coefSum += bet.coefficient
    map.set(bet.userId, entry)
  }

  const scoreboard = [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return b.coefSum - a.coefSum
  })

  return NextResponse.json(scoreboard)
}

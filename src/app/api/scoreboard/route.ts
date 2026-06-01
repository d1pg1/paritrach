import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const roundId = searchParams.get("roundId")

  const [users, winningBets] = await Promise.all([
    db.user.findMany({ select: { id: true, username: true } }),
    db.bet.findMany({
      where: { isWinner: true, ...(roundId ? { roundId } : {}) },
      select: { userId: true, coefficient: true },
    }),
  ])

  const statsMap = new Map<string, { points: number; coefSum: number }>()
  for (const bet of winningBets) {
    const entry = statsMap.get(bet.userId) ?? { points: 0, coefSum: 0 }
    entry.points += 1
    entry.coefSum += bet.coefficient
    statsMap.set(bet.userId, entry)
  }

  const scoreboard = users
    .map((u) => {
      const stats = statsMap.get(u.id) ?? { points: 0, coefSum: 0 }
      return { userId: u.id, username: u.username, ...stats }
    })
    .sort((a, b) => b.points !== a.points ? b.points - a.points : b.coefSum - a.coefSum)

  return NextResponse.json(scoreboard)
}

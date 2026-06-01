import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { id } = await params

  const round = await db.round.findUnique({
    where: { id },
    include: {
      matches: {
        where: { isEligible: true },
        include: {
          oddsSnapshot: true,
          bets: {
            where: { userId: session.user.id },
          },
        },
        orderBy: { startTime: "asc" },
      },
    },
  })
  if (!round) return new NextResponse("Not found", { status: 404 })

  return NextResponse.json(round)
}

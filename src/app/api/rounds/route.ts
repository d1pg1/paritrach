import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const rounds = await db.round.findMany({
    where: { status: { not: "SETUP" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { matches: { where: { isEligible: true } } } },
    },
  })
  return NextResponse.json(rounds)
}

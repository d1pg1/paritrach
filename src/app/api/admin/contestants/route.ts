import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const contestants = await db.seasonContestant.findMany({
    where: { seasonId: null },
    select: { userId: true },
  })
  return NextResponse.json(contestants.map((c) => c.userId))
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { userId } = await req.json()
  if (!userId) return new NextResponse("userId required", { status: 400 })

  const existing = await db.seasonContestant.findFirst({
    where: { seasonId: null, userId },
  })

  if (existing) {
    await db.seasonContestant.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: "removed" })
  }

  await db.seasonContestant.create({ data: { seasonId: null, userId } })
  return NextResponse.json({ action: "added" })
}

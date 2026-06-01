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

  const round = await db.round.create({ data: { name: name.trim() } })
  return NextResponse.json(round, { status: 201 })
}

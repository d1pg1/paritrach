import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return new NextResponse("Name required", { status: 400 })

  const count = await db.round.count({ where: { seasonId: null } })
  if (count === 0) return new NextResponse("No current rounds to archive", { status: 400 })

  const season = await db.$transaction(async (tx) => {
    const created = await tx.season.create({ data: { name: name.trim() } })
    await tx.round.updateMany({
      where: { seasonId: null },
      data: { seasonId: created.id },
    })
    return created
  })

  return NextResponse.json(season, { status: 201 })
}

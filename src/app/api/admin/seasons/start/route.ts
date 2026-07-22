import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { name, userIds } = await req.json()
  if (!name?.trim()) return new NextResponse("Name required", { status: 400 })

  const ids: string[] = Array.isArray(userIds) ? [...new Set(userIds)] : []
  if (ids.length < 2) {
    return new NextResponse("Pick at least 2 contestants", { status: 400 })
  }
  if (ids.length % 2 !== 0) {
    return new NextResponse("Pick an even number of contestants (bye rounds not supported yet)", { status: 400 })
  }

  const validUsers = await db.user.count({ where: { id: { in: ids } } })
  if (validUsers !== ids.length) {
    return new NextResponse("One or more selected contestants no longer exist", { status: 400 })
  }

  // Random draw performed at season start (not admin-chosen, not carried over from
  // prior standings) — fixes the order the circle method consumes for the whole season.
  const shuffled = [...ids].sort(() => Math.random() - 0.5)

  const season = await db.$transaction(async (tx) => {
    const created = await tx.season.create({ data: { name: name.trim(), format: "H2H" } })
    await tx.seasonContestant.createMany({
      data: shuffled.map((userId, drawPosition) => ({ seasonId: created.id, userId, drawPosition })),
    })
    await tx.settings.upsert({
      where: { id: "singleton" },
      update: { currentSeasonId: created.id },
      create: { id: "singleton", currentSeasonId: created.id },
    })
    return created
  })

  return NextResponse.json(season, { status: 201 })
}

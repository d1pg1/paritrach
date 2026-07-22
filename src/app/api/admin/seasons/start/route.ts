import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return new NextResponse("Name required", { status: 400 })

  const currentContestants = await db.seasonContestant.findMany({
    where: { seasonId: null },
    select: { id: true, userId: true },
  })
  if (currentContestants.length === 0) {
    return new NextResponse("No contestants to draw — add contestants before starting a season", { status: 400 })
  }

  // Random draw performed at season start (not admin-chosen, not carried over from
  // prior standings) — fixes the order the circle method consumes for the whole season.
  const shuffled = [...currentContestants].sort(() => Math.random() - 0.5)

  const season = await db.$transaction(async (tx) => {
    const created = await tx.season.create({ data: { name: name.trim(), format: "H2H" } })
    await Promise.all(
      shuffled.map((c, drawPosition) =>
        tx.seasonContestant.create({
          data: { seasonId: created.id, userId: c.userId, drawPosition },
        })
      )
    )
    await tx.seasonContestant.deleteMany({ where: { id: { in: shuffled.map((c) => c.id) } } })
    await tx.settings.upsert({
      where: { id: "singleton" },
      update: { currentSeasonId: created.id },
      create: { id: "singleton", currentSeasonId: created.id },
    })
    return created
  })

  return NextResponse.json(season, { status: 201 })
}

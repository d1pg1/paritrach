import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { LEAGUES, CUPS } from "@/lib/competitions"
import { importFixturesForCompetitions } from "@/lib/fixture-import"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; group: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id, group } = await params
  if (group !== "leagues" && group !== "cups") {
    return new NextResponse("Unknown competition group", { status: 400 })
  }

  const round = await db.round.findUnique({ where: { id } })
  if (!round) return new NextResponse("Round not found", { status: 404 })
  if (round.status !== "SETUP") return new NextResponse("Round not in SETUP state", { status: 400 })

  const result = await importFixturesForCompetitions(id, group === "leagues" ? LEAGUES : CUPS)
  return NextResponse.json(result)
}

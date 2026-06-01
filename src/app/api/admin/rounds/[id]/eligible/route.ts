import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// PATCH /api/admin/rounds/[id]/eligible
// body: { matchId: string, eligible: boolean }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const { matchId, eligible } = await req.json()

  const match = await db.match.findFirst({ where: { id: matchId, roundId: id } })
  if (!match) return new NextResponse("Match not found", { status: 404 })

  const updated = await db.match.update({
    where: { id: matchId },
    data: { isEligible: eligible },
  })

  return NextResponse.json(updated)
}

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const seasons = await db.season.findMany({
    orderBy: { archivedAt: "desc" },
    select: { id: true, name: true, archivedAt: true },
  })
  return NextResponse.json(seasons)
}

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const settings = await db.settings.findUnique({ where: { id: "singleton" } })
  return NextResponse.json(settings ?? { id: "singleton", currentSeasonName: null })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { currentSeasonName } = await req.json()

  const settings = await db.settings.upsert({
    where: { id: "singleton" },
    update: { currentSeasonName: currentSeasonName?.trim() || null },
    create: { id: "singleton", currentSeasonName: currentSeasonName?.trim() || null },
  })
  return NextResponse.json(settings)
}

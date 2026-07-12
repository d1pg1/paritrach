import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params
  const { nickname, telegramUsername } = await req.json()

  const data: { nickname?: string | null; telegramUsername?: string | null } = {}
  if (nickname !== undefined) data.nickname = nickname?.trim() || null
  if (telegramUsername !== undefined) data.telegramUsername = telegramUsername?.trim().replace(/^@/, "") || null

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, username: true, nickname: true, telegramUsername: true, role: true, createdAt: true, _count: { select: { bets: true } } },
  })

  return NextResponse.json(user)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params

  const target = await db.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return NextResponse.json({ message: "User not found" }, { status: 404 })
  if (target.role === "ADMIN") {
    return NextResponse.json({ message: "Cannot delete an admin user" }, { status: 403 })
  }

  await db.bet.deleteMany({ where: { userId: id } })
  await db.user.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}

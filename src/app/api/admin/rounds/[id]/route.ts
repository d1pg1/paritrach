import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { cancelReminder } from "@/lib/qstash"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 })

  const { id } = await params

  const round = await db.round.findUnique({ where: { id }, select: { id: true, telegramReminderMessageId: true } })
  if (!round) return new NextResponse("Not found", { status: 404 })

  if (round.telegramReminderMessageId) {
    // best effort — don't let a QStash hiccup block round deletion
    await cancelReminder(round.telegramReminderMessageId).catch(() => {})
  }

  const matchIds = (
    await db.match.findMany({ where: { roundId: id }, select: { id: true } })
  ).map((m) => m.id)

  await db.oddsSnapshot.deleteMany({ where: { matchId: { in: matchIds } } })
  await db.bet.deleteMany({ where: { roundId: id } })
  await db.match.deleteMany({ where: { roundId: id } })
  await db.round.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

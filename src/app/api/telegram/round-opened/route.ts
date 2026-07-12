import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendGroupMessage } from "@/lib/telegram"
import { scheduleReminder } from "@/lib/qstash"
import { applyQuietHoursAdjustment } from "@/lib/quiet-hours"

const THREE_HOURS_MS = 3 * 60 * 60 * 1000

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret")
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const { roundId } = await req.json()

  const round = await db.round.findUnique({
    where: { id: roundId },
    include: {
      matches: {
        where: { isEligible: true },
        orderBy: { startTime: "asc" },
        take: 1,
      },
    },
  })
  if (!round) return new NextResponse("Round not found", { status: 404 })

  await sendGroupMessage(`🟡 Round <b>${round.name}</b> is open for betting!`)

  const firstMatch = round.matches[0]
  if (!firstMatch) return NextResponse.json({ reminderScheduled: false })

  let fireAt = new Date(firstMatch.startTime.getTime() - THREE_HOURS_MS)
  fireAt = applyQuietHoursAdjustment(fireAt, process.env.TELEGRAM_TIMEZONE!)

  if (fireAt.getTime() <= Date.now()) {
    return NextResponse.json({ reminderScheduled: false })
  }

  const messageId = await scheduleReminder(round.id, fireAt)
  await db.round.update({ where: { id: round.id }, data: { telegramReminderMessageId: messageId } })

  return NextResponse.json({ reminderScheduled: true, fireAt })
}

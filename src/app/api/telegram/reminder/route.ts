import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { escapeHtml, sendGroupMessage } from "@/lib/telegram"
import { verifyQStashRequest } from "@/lib/qstash"
import { getUsersWithMissingBets } from "@/lib/telegram-notifications"

export async function POST(req: Request) {
  const valid = await verifyQStashRequest(req)
  if (!valid) return new NextResponse("Invalid signature", { status: 200 })

  const { roundId } = await req.json()

  const round = await db.round.findUnique({ where: { id: roundId } })
  if (!round || round.status !== "BETTING") {
    return NextResponse.json({ sent: false })
  }

  const missing = await getUsersWithMissingBets(roundId)
  if (missing.length === 0) return NextResponse.json({ sent: false })

  const mentions = missing.map((u) => `@${escapeHtml(u.telegramUsername)}`).join(" ")
  const text = `⏰ Reminder: <b>${escapeHtml(round.name)}</b> starts soon!\n\nMissing bets: ${mentions}`

  await sendGroupMessage(text)
  return NextResponse.json({ sent: true })
}

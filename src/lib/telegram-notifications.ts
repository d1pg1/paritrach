import { db } from "@/lib/db"
import { applyQuietHoursAdjustment } from "@/lib/quiet-hours"
import { scheduleReminder } from "@/lib/qstash"
import { escapeHtml, sendGroupMessage } from "@/lib/telegram"

const THREE_HOURS_MS = 3 * 60 * 60 * 1000

const MIN_COEF_JOKES = [
  "living life on the edge of the couch.",
  "risk management 101.",
  "found the safest bet in the building and still hesitated.",
  "bold strategy: betting like it's someone else's money and still playing it safe.",
  "the thrill of almost taking a risk.",
  "playing chess while everyone else plays roulette.",
]

// Fired when a bet is placed or edited to sit exactly at the minimum
// allowed coefficient — a lighthearted jab at the safest possible pick.
export async function notifyMinCoefBet(
  username: string,
  homeTeam: string,
  awayTeam: string
): Promise<void> {
  const joke = MIN_COEF_JOKES[Math.floor(Math.random() * MIN_COEF_JOKES.length)]
  try {
    await sendGroupMessage(
      `🐢 <b>${escapeHtml(username)}</b> just bet the bare minimum (1.40) on <b>${escapeHtml(homeTeam)} vs ${escapeHtml(awayTeam)}</b> — ${escapeHtml(joke)}`
    )
  } catch (err) {
    console.error("[telegram] failed to send min-coef bet notification", err)
  }
}

export async function getUsersWithMissingBets(
  roundId: string
): Promise<{ username: string; telegramUsername: string }[]> {
  const eligibleMatchCount = await db.match.count({ where: { roundId, isEligible: true } })
  if (eligibleMatchCount === 0) return []

  const contestants = await db.seasonContestant.findMany({
    where: { seasonId: null, user: { telegramUsername: { not: null } } },
    include: { user: { select: { username: true, telegramUsername: true } } },
  })
  if (contestants.length === 0) return []

  const betCounts = await db.bet.groupBy({
    by: ["userId"],
    where: { roundId, userId: { in: contestants.map((c) => c.userId) } },
    _count: { id: true },
  })
  const betCountByUserId = new Map(betCounts.map((b) => [b.userId, b._count.id]))

  return contestants
    .filter((c) => (betCountByUserId.get(c.userId) ?? 0) < eligibleMatchCount)
    .map((c) => ({ username: c.user.username, telegramUsername: c.user.telegramUsername! }))
}

// Announces a round opening and schedules a pre-match reminder via QStash.
// Called directly (not over HTTP) from the open-betting route so it needs
// neither a public app URL nor a shared secret to run.
export async function notifyRoundOpened(roundId: string): Promise<void> {
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
  if (!round) return

  try {
    await sendGroupMessage(`🟡 Round <b>${escapeHtml(round.name)}</b> is open for betting!`)
  } catch (err) {
    console.error("[telegram] failed to send round-opened announcement", err)
  }

  const firstMatch = round.matches[0]
  if (!firstMatch) return

  const timeZone = process.env.TELEGRAM_TIMEZONE
  if (!timeZone) {
    console.error("[telegram] TELEGRAM_TIMEZONE is not configured — skipping reminder scheduling")
    return
  }

  const fireAt = applyQuietHoursAdjustment(new Date(firstMatch.startTime.getTime() - THREE_HOURS_MS), timeZone)
  if (fireAt.getTime() <= Date.now()) return

  try {
    const messageId = await scheduleReminder(round.id, fireAt)
    await db.round.update({ where: { id: round.id }, data: { telegramReminderMessageId: messageId } })
  } catch (err) {
    console.error("[telegram] failed to schedule reminder", err)
  }
}

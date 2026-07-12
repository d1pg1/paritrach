import { db } from "@/lib/db"

export async function getUsersWithMissingBets(
  roundId: string
): Promise<{ username: string; telegramUsername: string }[]> {
  const eligibleMatchCount = await db.match.count({ where: { roundId, isEligible: true } })
  if (eligibleMatchCount === 0) return []

  const contestants = await db.seasonContestant.findMany({
    where: { seasonId: null, user: { telegramUsername: { not: null } } },
    include: { user: { select: { username: true, telegramUsername: true } } },
  })

  const missing: { username: string; telegramUsername: string }[] = []
  for (const contestant of contestants) {
    const betCount = await db.bet.count({ where: { roundId, userId: contestant.userId } })
    if (betCount < eligibleMatchCount) {
      missing.push({
        username: contestant.user.username,
        telegramUsername: contestant.user.telegramUsername!,
      })
    }
  }
  return missing
}

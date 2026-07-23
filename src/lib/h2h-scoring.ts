import { db } from "@/lib/db"
import { getPairingsForRound } from "@/lib/h2h-schedule"

// Scoring rule for a pairing (A vs B) over a round's eligible matches: whoever has
// more correct picks gets 3 points and the loser gets 0; a tie (including 0-0) gives
// both sides 1 point. A missing bet counts as incorrect, same as a wrong guess.
export function scorePairing(correctA: number, correctB: number): [number, number] {
  if (correctA > correctB) return [3, 0]
  if (correctA < correctB) return [0, 3]
  return [1, 1]
}

export function countCorrectByUser(bets: { userId: string; isWinner: boolean | null }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const bet of bets) {
    if (bet.isWinner !== true) continue
    counts.set(bet.userId, (counts.get(bet.userId) ?? 0) + 1)
  }
  return counts
}

export interface RoundPairingScore {
  opponentId: string
  yourCorrect: number
  theirCorrect: number
  points: number
}

export function scoreRoundPairings(
  pairings: [string, string][],
  correctByUser: Map<string, number>
): Map<string, RoundPairingScore> {
  const result = new Map<string, RoundPairingScore>()
  for (const [a, b] of pairings) {
    const correctA = correctByUser.get(a) ?? 0
    const correctB = correctByUser.get(b) ?? 0
    const [pointsA, pointsB] = scorePairing(correctA, correctB)
    result.set(a, { opponentId: b, yourCorrect: correctA, theirCorrect: correctB, points: pointsA })
    result.set(b, { opponentId: a, yourCorrect: correctB, theirCorrect: correctA, points: pointsB })
  }
  return result
}

export async function computeH2HStandings(
  seasonId: string
): Promise<Map<string, { points: number; coefSum: number }>> {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    select: { contestants: { orderBy: { drawPosition: "asc" }, select: { userId: true } } },
  })
  const standings = new Map<string, { points: number; coefSum: number }>()
  if (!season) return standings

  const drawOrder = season.contestants.map((c) => c.userId)
  for (const userId of drawOrder) standings.set(userId, { points: 0, coefSum: 0 })
  if (drawOrder.length < 2) return standings

  const rounds = await db.round.findMany({
    where: { seasonId, sequenceNumber: { not: null } },
    select: {
      sequenceNumber: true,
      bets: {
        select: { userId: true, isWinner: true, coefficient: true, match: { select: { isEligible: true } } },
      },
    },
    orderBy: { sequenceNumber: "asc" },
  })

  for (const round of rounds) {
    const eligibleBets = round.bets.filter((b) => b.match.isEligible)
    const correctByUser = countCorrectByUser(eligibleBets)
    const pairings = getPairingsForRound(drawOrder, round.sequenceNumber!)
    const scored = scoreRoundPairings(pairings, correctByUser)
    for (const [userId, { points }] of scored) {
      const entry = standings.get(userId) ?? { points: 0, coefSum: 0 }
      entry.points += points
      standings.set(userId, entry)
    }

    // coefSum: sum of per-round products of winning bet coefficients — same rule as
    // the SOLO scoreboard, independent of head-to-head result.
    const coefsByUser = new Map<string, number[]>()
    for (const bet of round.bets) {
      if (bet.isWinner !== true) continue
      const coefs = coefsByUser.get(bet.userId) ?? []
      coefs.push(bet.coefficient)
      coefsByUser.set(bet.userId, coefs)
    }
    for (const [userId, coefs] of coefsByUser) {
      const entry = standings.get(userId) ?? { points: 0, coefSum: 0 }
      entry.coefSum += coefs.reduce((acc, c) => acc * c, 1)
      standings.set(userId, entry)
    }
  }

  return standings
}

export interface RoundH2HPairing {
  contestantAId: string
  contestantAName: string
  contestantBId: string
  contestantBName: string
  correctA: number
  correctB: number
}

// Every pairing (with live scorelines) for one round — used on the round betting page
// and re-polled by the live-scores route so it updates the same way match scores do.
export async function getRoundH2HPairings(roundId: string): Promise<RoundH2HPairing[]> {
  const round = await db.round.findUnique({
    where: { id: roundId },
    select: {
      sequenceNumber: true,
      season: {
        select: {
          format: true,
          contestants: {
            orderBy: { drawPosition: "asc" },
            select: { userId: true, user: { select: { nickname: true, username: true } } },
          },
        },
      },
      matches: {
        where: { isEligible: true },
        select: { bets: { select: { userId: true, isWinner: true } } },
      },
    },
  })
  if (!round || !round.season || round.season.format !== "H2H" || round.sequenceNumber == null) return []

  const contestants = round.season.contestants
  const drawOrder = contestants.map((c) => c.userId)
  if (drawOrder.length < 2) return []

  const pairings = getPairingsForRound(drawOrder, round.sequenceNumber)
  const correctByUser = countCorrectByUser(round.matches.flatMap((m) => m.bets))
  const nameById = new Map(contestants.map((c) => [c.userId, c.user.nickname ?? c.user.username ?? "?"]))

  return pairings.map(([a, b]) => ({
    contestantAId: a,
    contestantAName: nameById.get(a) ?? "?",
    contestantBId: b,
    contestantBName: nameById.get(b) ?? "?",
    correctA: correctByUser.get(a) ?? 0,
    correctB: correctByUser.get(b) ?? 0,
  }))
}

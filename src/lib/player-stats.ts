import { db } from "@/lib/db"
import { excludeTestRoundsWhere } from "@/lib/test-round-filter"

export interface PlayerBet {
  marketType: string
  selection: string
  coefficient: number
  isWinner: boolean | null
  match: { startTime: Date; homeTeam: string; awayTeam: string }
}

export interface MarketBreakdown {
  marketType: string
  count: number
}

export interface MarketWinRate {
  marketType: string
  wins: number
  settled: number
  winRate: number
}

export interface BiggestWin {
  coefficient: number
  marketType: string
  selection: string
  homeTeam: string
  awayTeam: string
}

export interface PlayerStats {
  totalBets: number
  settledBets: number
  wins: number
  losses: number
  winRate: number | null
  currentStreak: number
  bestWinStreak: number
  favoriteMarket: MarketBreakdown | null
  bestMarket: MarketWinRate | null
  avgExpressCoefficient: number | null
  biggestWin: BiggestWin | null
  roundsPlayed: number
  memberSince: Date | null
}

// Minimum settled bets in a market before its win rate counts toward "best market" —
// avoids a single lucky pick on a rarely-used market looking like a specialty.
const MIN_MARKET_SAMPLE = 3

function computeStreaks(chronological: { isWinner: boolean | null }[]): { current: number; best: number } {
  let run = 0
  let runIsWin: boolean | null = null
  let best = 0
  for (const bet of chronological) {
    if (bet.isWinner === null) continue
    if (bet.isWinner === runIsWin) {
      run++
    } else {
      run = 1
      runIsWin = bet.isWinner
    }
    if (runIsWin === true) best = Math.max(best, run)
  }
  const current = runIsWin === true ? run : runIsWin === false ? -run : 0
  return { current, best }
}

export async function getPlayerStats(userId: string, seasonId?: string | null): Promise<PlayerStats> {
  const bets = await db.bet.findMany({
    where: {
      userId,
      round: seasonId ? { ...excludeTestRoundsWhere, seasonId } : excludeTestRoundsWhere,
    },
    select: {
      marketType: true,
      selection: true,
      coefficient: true,
      isWinner: true,
      roundId: true,
      createdAt: true,
      match: { select: { startTime: true, homeTeam: true, awayTeam: true } },
    },
    orderBy: { match: { startTime: "asc" } },
  })

  const totalBets = bets.length
  const settled = bets.filter((b) => b.isWinner !== null)
  const wins = settled.filter((b) => b.isWinner === true).length
  const losses = settled.length - wins
  const winRate = settled.length > 0 ? wins / settled.length : null

  const { current: currentStreak, best: bestWinStreak } = computeStreaks(bets)

  const marketCounts = new Map<string, number>()
  const marketStats = new Map<string, { wins: number; settled: number }>()
  for (const bet of bets) {
    marketCounts.set(bet.marketType, (marketCounts.get(bet.marketType) ?? 0) + 1)
    if (bet.isWinner !== null) {
      const s = marketStats.get(bet.marketType) ?? { wins: 0, settled: 0 }
      s.settled++
      if (bet.isWinner) s.wins++
      marketStats.set(bet.marketType, s)
    }
  }

  let favoriteMarket: MarketBreakdown | null = null
  for (const [marketType, count] of marketCounts) {
    if (!favoriteMarket || count > favoriteMarket.count) favoriteMarket = { marketType, count }
  }

  let bestMarket: MarketWinRate | null = null
  for (const [marketType, s] of marketStats) {
    if (s.settled < MIN_MARKET_SAMPLE) continue
    const winRate = s.wins / s.settled
    if (!bestMarket || winRate > bestMarket.winRate || (winRate === bestMarket.winRate && s.settled > bestMarket.settled)) {
      bestMarket = { marketType, wins: s.wins, settled: s.settled, winRate }
    }
  }

  // Odds are meant to be read the way the app scores rounds: winning bets in the same
  // round multiply together like an accumulator/express, not a flat per-bet average.
  // This also neutralizes "legacy" bets (a fixed coefficient of 1, pre-dating the real
  // odds system) since multiplying by 1 is a no-op, instead of dragging the mean down.
  const winCoefsByRound = new Map<string, number[]>()
  for (const bet of bets) {
    if (bet.isWinner !== true) continue
    const coefs = winCoefsByRound.get(bet.roundId) ?? []
    coefs.push(bet.coefficient)
    winCoefsByRound.set(bet.roundId, coefs)
  }
  const roundExpresses = [...winCoefsByRound.values()].map((coefs) => coefs.reduce((acc, c) => acc * c, 1))
  const avgExpressCoefficient = roundExpresses.length > 0
    ? roundExpresses.reduce((sum, v) => sum + v, 0) / roundExpresses.length
    : null

  const biggestWinBet = bets
    .filter((b) => b.isWinner === true)
    .sort((a, b) => b.coefficient - a.coefficient)[0]
  const biggestWin: BiggestWin | null = biggestWinBet
    ? {
        coefficient: biggestWinBet.coefficient,
        marketType: biggestWinBet.marketType,
        selection: biggestWinBet.selection,
        homeTeam: biggestWinBet.match.homeTeam,
        awayTeam: biggestWinBet.match.awayTeam,
      }
    : null

  const roundsPlayed = new Set(bets.map((b) => b.roundId)).size

  // "Member since" is derived from their first stake rather than the User row's
  // createdAt — that field reflects a database migration timestamp, not a real join date.
  const memberSince = bets.length > 0
    ? new Date(Math.min(...bets.map((b) => b.createdAt.getTime())))
    : null

  return {
    totalBets,
    settledBets: settled.length,
    wins,
    losses,
    winRate,
    currentStreak,
    bestWinStreak,
    favoriteMarket,
    bestMarket,
    avgExpressCoefficient,
    biggestWin,
    roundsPlayed,
    memberSince,
  }
}

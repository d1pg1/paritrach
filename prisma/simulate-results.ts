import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { settleBet } from "../src/lib/settlement"

const adapter = new PrismaPg(process.env.DATABASE_URL!)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new PrismaClient({ adapter } as any)

const SCORE_ROTATION = [
  [2, 0], [0, 1], [1, 1], [3, 1],
  [0, 2], [2, 1], [1, 0], [0, 0],
]

async function main() {
  const rounds = await db.round.findMany({
    where: { status: { in: ["BETTING", "CLOSED"] } },
    include: {
      matches: {
        where: { isEligible: true },
        include: { bets: true },
      },
    },
  })

  if (rounds.length === 0) {
    console.log("No rounds in BETTING or CLOSED status found.")
    return
  }

  let matchIdx = 0
  let totalBetsSettled = 0

  for (const round of rounds) {
    console.log(`\nRound: ${round.name} (${round.status})`)
    for (const match of round.matches) {
      if (match.status === "FINAL") {
        console.log(`  [SKIP] ${match.homeTeam} vs ${match.awayTeam} — already final`)
        continue
      }

      const [homeScore, awayScore] = SCORE_ROTATION[matchIdx % SCORE_ROTATION.length]
      matchIdx++

      await db.match.update({
        where: { id: match.id },
        data: { homeScore, awayScore, status: "FINAL" },
      })
      console.log(`  [SET]  ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}`)

      for (const bet of match.bets) {
        if (bet.isWinner !== null) continue
        const won = settleBet({
          marketType: bet.marketType,
          selection: bet.selection,
          line: bet.line,
          homeScore,
          awayScore,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
        })
        if (won !== null) {
          await db.bet.update({ where: { id: bet.id }, data: { isWinner: won } })
          totalBetsSettled++
        }
      }
    }

    const remaining = await db.match.count({
      where: { roundId: round.id, isEligible: true, status: { not: "FINAL" } },
    })
    if (remaining === 0) {
      await db.round.update({ where: { id: round.id }, data: { status: "RESULTS" } })
      console.log(`  => Round status set to RESULTS`)
    }
  }

  console.log(`\nTotal bets settled: ${totalBetsSettled}`)

  const winningBets = await db.bet.findMany({
    where: { isWinner: true },
    include: { user: { select: { id: true, username: true } } },
  })

  const map = new Map<string, { username: string; points: number; coefSum: number }>()
  for (const bet of winningBets) {
    const entry = map.get(bet.userId) ?? { username: bet.user.username, points: 0, coefSum: 0 }
    entry.points += 1
    entry.coefSum += bet.coefficient
    map.set(bet.userId, entry)
  }

  const scoreboard = [...map.values()].sort((a, b) =>
    b.points !== a.points ? b.points - a.points : b.coefSum - a.coefSum
  )

  console.log("\n=== SCOREBOARD ===")
  console.log("Rank  Username       Points  CoefSum")
  console.log("----  -------------  ------  -------")
  scoreboard.forEach((row, i) => {
    console.log(
      `${String(i + 1).padEnd(6)}${row.username.padEnd(15)}${String(row.points).padEnd(8)}${row.coefSum.toFixed(2)}`
    )
  })
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())

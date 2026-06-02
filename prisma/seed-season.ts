import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import seasonData from "../season_results.json"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(process.env.DATABASE_URL!) as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new PrismaClient({ adapter } as any)

const USER_MAP: Record<string, string> = {
  "Дима": "dima",
  "Саша": "sasha",
  "Даня": "Danya",
  "Дарина": "daryna",
}

function parseDate(raw: string): Date {
  // "17.08.2025 20:29:31 UTC+02:00" → "2025-08-17T20:29:31+02:00"
  const parts = raw.split(" ")
  const [d, m, y] = parts[0].split(".")
  const time = parts[1]
  const offset = parts[2].replace("UTC", "")
  return new Date(`${y}-${m}-${d}T${time}${offset}`)
}

interface BetEntry {
  team_a: string
  team_b: string
  bet: string
  result: "win" | "loss"
}

interface BettorEntry {
  bets: BetEntry[]
  wins: number
  losses: number
}

interface RoundEntry {
  round: number
  date: string
  bettors: Record<string, BettorEntry>
}

async function main() {
  const users = await db.user.findMany({
    where: { username: { in: Object.values(USER_MAP) } },
    select: { id: true, username: true },
  })
  const userIdMap = new Map(users.map((u) => [u.username, u.id]))

  // Check if season already exists to make it idempotent
  const existing = await db.season.findFirst({ where: { name: "2025/26" } })
  if (existing) {
    console.log("Season 2025/26 already exists, skipping.")
    return
  }

  const season = await db.season.create({ data: { name: "2025/26" } })
  console.log(`Created season: ${season.name} (${season.id})`)

  for (const roundData of seasonData as RoundEntry[]) {
    const roundDate = parseDate(roundData.date)
    const round = await db.round.create({
      data: {
        name: `Тур ${roundData.round}`,
        status: "RESULTS",
        seasonId: season.id,
        createdAt: roundDate,
      },
    })
    console.log(`  Round ${roundData.round}: ${round.id}`)

    // Deduplicate matches by (team_a, team_b) across all bettors
    const matchMap = new Map<string, { team_a: string; team_b: string }>()
    for (const bettor of Object.values(roundData.bettors)) {
      for (const bet of bettor.bets) {
        const key = `${bet.team_a}|||${bet.team_b}`
        if (!matchMap.has(key)) matchMap.set(key, { team_a: bet.team_a, team_b: bet.team_b })
      }
    }

    // Create match records
    const matchIdMap = new Map<string, string>()
    for (const [key, { team_a, team_b }] of matchMap) {
      const match = await db.match.create({
        data: {
          roundId: round.id,
          homeTeam: team_a,
          awayTeam: team_b,
          startTime: roundDate,
          status: "FINAL",
          isEligible: true,
        },
      })
      matchIdMap.set(key, match.id)
    }

    // Create bet records
    for (const [cyrillicName, bettor] of Object.entries(roundData.bettors)) {
      const dbUsername = USER_MAP[cyrillicName]
      if (!dbUsername) {
        console.warn(`    Unknown bettor: ${cyrillicName}`)
        continue
      }
      const userId = userIdMap.get(dbUsername)
      if (!userId) {
        console.warn(`    User not in DB: ${dbUsername}`)
        continue
      }

      for (const bet of bettor.bets) {
        const key = `${bet.team_a}|||${bet.team_b}`
        const matchId = matchIdMap.get(key)
        if (!matchId) continue

        await db.bet.upsert({
          where: { userId_matchId: { userId, matchId } },
          update: {},
          create: {
            userId,
            matchId,
            roundId: round.id,
            marketType: "legacy",
            selection: bet.bet,
            coefficient: 1.0,
            isWinner: bet.result === "win",
          },
        })
      }
    }
  }

  console.log("Seed complete.")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())

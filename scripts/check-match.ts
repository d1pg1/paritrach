import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

async function main() {
  const matches = await db.match.findMany({
    where: {
      OR: [
        { homeTeam: { contains: "Scotland", mode: "insensitive" } },
        { awayTeam: { contains: "Scotland", mode: "insensitive" } },
        { homeTeam: { contains: "Brazil", mode: "insensitive" } },
        { awayTeam: { contains: "Brazil", mode: "insensitive" } },
      ]
    },
    include: {
      oddsSnapshot: true,
      bets: { select: { selection: true, coefficient: true, marketType: true, isWinner: true, user: { select: { nickname: true, username: true } } } }
    }
  })

  for (const m of matches) {
    console.log(`\n=== ${m.homeTeam} vs ${m.awayTeam} ===`)
    console.log(`Status: ${m.status}, Score: ${m.homeScore}:${m.awayScore}`)
    console.log(`Start: ${m.startTime}`)
    if (m.oddsSnapshot) {
      const odds = m.oddsSnapshot.oddsData as any
      const h2h = Object.values(odds as object).find((m: any) => m.key === "h2h") as any
      if (h2h) {
        console.log("H2H outcomes:", JSON.stringify(h2h.outcomes, null, 2))
      }
    }
    console.log("Bets:")
    for (const b of m.bets) {
      console.log(`  ${b.user.nickname ?? b.user.username}: ${b.marketType} / ${b.selection} @ ${b.coefficient} → ${b.isWinner}`)
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect())

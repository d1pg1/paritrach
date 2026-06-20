import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

async function main() {
  const matches = await db.match.findMany({
    where: {
      AND: [
        { homeTeam: { contains: "Scotland", mode: "insensitive" } },
        { awayTeam: { contains: "Brazil", mode: "insensitive" } },
      ],
    },
    select: { id: true, homeTeam: true, awayTeam: true },
  })

  console.log("Found matches:", JSON.stringify(matches, null, 2))

  for (const m of matches) {
    await db.match.update({
      where: { id: m.id },
      data: { homeTeam: m.awayTeam, awayTeam: m.homeTeam },
    })
    console.log(`Swapped: "${m.homeTeam}" <-> "${m.awayTeam}"`)
  }

  console.log("Done.")
}

main().catch(console.error).finally(() => db.$disconnect())

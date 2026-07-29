import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { resolveLogoUrl } from "@/lib/team-logo-resolver"
import { competitionToEspnSlugs } from "@/lib/apis/espn"

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) } as any)

async function main() {
  const teams = await db.team.findMany({ where: { logoUrl: null }, select: { id: true, name: true } })
  console.log(`Found ${teams.length} teams with no logo`)

  for (const team of teams) {
    const match = await db.match.findFirst({
      where: { OR: [{ homeTeam: team.name }, { awayTeam: team.name }] },
      select: { competition: true },
    })
    const espnSlugs = competitionToEspnSlugs(match?.competition)
    const logoUrl = await resolveLogoUrl(team.name, espnSlugs)
    await new Promise((r) => setTimeout(r, 3000))
    if (logoUrl) {
      await db.team.update({ where: { id: team.id }, data: { logoUrl } })
      console.log(`✓ ${team.name} -> ${logoUrl}`)
    } else {
      console.log(`✗ ${team.name} (no logo found)`)
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect())
